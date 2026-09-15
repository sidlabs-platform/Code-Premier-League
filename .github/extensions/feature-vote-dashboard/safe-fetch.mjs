import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 1_048_576;

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 96],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
]) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

const loopbackAddresses = new BlockList();
loopbackAddresses.addSubnet("127.0.0.0", 8, "ipv4");
loopbackAddresses.addAddress("::1", "ipv6");

export class UnsafeAppUrlError extends Error {
  constructor(message = "The hosted app URL must use a publicly routable host.") {
    super(message);
    this.name = "UnsafeAppUrlError";
  }
}

function bareHostname(url) {
  return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function addressFamilyName(family) {
  return family === 4 ? "ipv4" : "ipv6";
}

function isBlockedAddress(address, family) {
  return blockedAddresses.check(address, addressFamilyName(family));
}

function isLoopbackAddress(address, family) {
  return loopbackAddresses.check(address, addressFamilyName(family));
}

function validateRequestUrl(url) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeAppUrlError(
      "The hosted app URL and its redirects must use HTTP or HTTPS.",
    );
  }
  if (url.username || url.password) {
    throw new UnsafeAppUrlError(
      "The hosted app URL and its redirects must not include credentials.",
    );
  }
}

export function validateConfiguredHost(url) {
  validateRequestUrl(url);
  const hostname = bareHostname(url);
  if (hostname === "localhost") {
    return;
  }

  const family = isIP(hostname);
  if (family && isBlockedAddress(hostname, family)) {
    throw new UnsafeAppUrlError();
  }
}

async function resolveTarget(url, allowLocalhost, lookup = dnsLookup) {
  validateRequestUrl(url);
  const hostname = bareHostname(url);
  const localhostException = allowLocalhost && hostname === "localhost";
  const addresses = await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0) {
    throw new Error("The hosted app host did not resolve to an IP address.");
  }

  for (const { address, family } of addresses) {
    if (
      localhostException
        ? !isLoopbackAddress(address, family)
        : isBlockedAddress(address, family)
    ) {
      throw new UnsafeAppUrlError();
    }
  }

  return addresses;
}

function readResponse(url, addresses, signal) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(
      url,
      {
        headers: { Accept: "application/json" },
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options.all) {
            callback(null, addresses);
            return;
          }
          const address = addresses[0];
          callback(null, address.address, address.family);
        },
        signal,
      },
      (response) => {
        const chunks = [];
        let size = 0;

        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            response.destroy(
              new Error("The hosted app response exceeded one megabyte."),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            headers: response.headers,
            status: response.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}

export async function fetchTextWithHostPolicy(
  input,
  { timeout = 8_000, lookup = dnsLookup } = {},
) {
  let currentUrl = input instanceof URL ? new URL(input) : new URL(input);
  const allowLocalhost = bareHostname(currentUrl) === "localhost";
  const signal = AbortSignal.timeout(timeout);

  for (let redirectCount = 0; ; redirectCount += 1) {
    const addresses = await resolveTarget(currentUrl, allowLocalhost, lookup);
    const response = await readResponse(currentUrl, addresses, signal);

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }
    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error("The hosted app redirected too many times.");
    }

    const location = response.headers.location;
    if (!location) {
      throw new Error("The hosted app returned a redirect without a location.");
    }
    currentUrl = new URL(location, currentUrl);
  }
}
