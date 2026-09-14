import type { CataloguePlayer, ChallengeQuestion, PlayerRole } from "@/lib/types";

export const CATALOGUE_LAST_UPDATED = "2026-09-14";

type PlayerSeed = {
  name: string;
  role: PlayerRole;
  origin: "India" | "England" | "West Indies";
};

// Names, countries, and broad playing roles are curated from the sources linked
// in README.md. Prices and ratings below are generated solely for this game.
const playerSeeds: PlayerSeed[] = [
  { name: "Shubman Gill", role: "BAT", origin: "India" },
  { name: "Jasprit Bumrah", role: "BOWL", origin: "India" },
  { name: "Ravindra Jadeja", role: "AR", origin: "India" },
  { name: "Washington Sundar", role: "AR", origin: "India" },
  { name: "Rohit Sharma", role: "BAT", origin: "India" },
  { name: "Virat Kohli", role: "BAT", origin: "India" },
  { name: "KL Rahul", role: "WK", origin: "India" },
  { name: "Mohammed Siraj", role: "BOWL", origin: "India" },
  { name: "Hardik Pandya", role: "AR", origin: "India" },
  { name: "Rishabh Pant", role: "WK", origin: "India" },
  { name: "Kuldeep Yadav", role: "BOWL", origin: "India" },
  { name: "Yashasvi Jaiswal", role: "BAT", origin: "India" },
  { name: "Suryakumar Yadav", role: "BAT", origin: "India" },
  { name: "Shreyas Iyer", role: "BAT", origin: "India" },
  { name: "Axar Patel", role: "AR", origin: "India" },
  { name: "Tilak Varma", role: "BAT", origin: "India" },
  { name: "Rinku Singh", role: "BAT", origin: "India" },
  { name: "Shivam Dube", role: "AR", origin: "India" },
  { name: "Sanju Samson", role: "WK", origin: "India" },
  { name: "Arshdeep Singh", role: "BOWL", origin: "India" },
  { name: "Prasidh Krishna", role: "BOWL", origin: "India" },
  { name: "Akash Deep", role: "BOWL", origin: "India" },
  { name: "Dhruv Jurel", role: "WK", origin: "India" },
  { name: "Harshit Rana", role: "BOWL", origin: "India" },
  { name: "Varun Chakaravarthy", role: "BOWL", origin: "India" },
  { name: "Nitish Kumar Reddy", role: "AR", origin: "India" },
  { name: "Abhishek Sharma", role: "AR", origin: "India" },
  { name: "Sai Sudharsan", role: "BAT", origin: "India" },
  { name: "Ravi Bishnoi", role: "BOWL", origin: "India" },
  { name: "Ruturaj Gaikwad", role: "BAT", origin: "India" },
  { name: "Harry Brook", role: "BAT", origin: "England" },
  { name: "Jos Buttler", role: "WK", origin: "England" },
  { name: "Jofra Archer", role: "BOWL", origin: "England" },
  { name: "Sam Curran", role: "AR", origin: "England" },
  { name: "Phil Salt", role: "WK", origin: "England" },
  { name: "Adil Rashid", role: "BOWL", origin: "England" },
  { name: "Ben Duckett", role: "BAT", origin: "England" },
  { name: "Shai Hope", role: "WK", origin: "West Indies" },
  { name: "Shimron Hetmyer", role: "BAT", origin: "West Indies" },
  { name: "Jason Holder", role: "AR", origin: "West Indies" },
  { name: "Akeal Hosein", role: "BOWL", origin: "West Indies" },
  { name: "Rovman Powell", role: "BAT", origin: "West Indies" },
  { name: "Romario Shepherd", role: "AR", origin: "West Indies" },
  { name: "Jayden Seales", role: "BOWL", origin: "West Indies" },
];

const accents = [
  "#ff6b4a",
  "#d9ff43",
  "#62d8ff",
  "#ffcf5a",
  "#f58cff",
  "#8ba4ff",
  "#66e3b4",
  "#ff8aa3",
];

function stat(index: number, offset: number, floor = 48, span = 49): number {
  return floor + ((index * 17 + offset * 23) % span);
}

export const PLAYER_CATALOGUE: CataloguePlayer[] = playerSeeds.map(
  ({ name, role, origin }, index) => {
    const batting =
      role === "BAT" || role === "WK" ? stat(index, 2, 64, 33) : stat(index, 3);
    const bowling =
      role === "BOWL" || role === "AR" ? stat(index, 5, 62, 35) : stat(index, 7, 24, 42);
    const sequence = String(index + 1).padStart(2, "0");
    const countryCode =
      origin === "India" ? "IND" : origin === "England" ? "ENG" : "WI";

    return {
      id: `player-${sequence}`,
      name,
      callSign: `${countryCode}-${sequence}`,
      role,
      overseas: origin !== "India",
      origin,
      basePrice: 100 + (index % 7) * 50,
      bio: `${origin} · CPL prices and ratings are simulated for educational gameplay and are not official statistics or valuations.`,
      accent: accents[index % accents.length],
      stats: {
        batting,
        bowling,
        form: stat(index, 11),
        pressure: stat(index, 13),
        fielding: stat(index, 17),
        venue: stat(index, 19),
      },
    };
  },
);

export const CHALLENGE_QUESTIONS: ChallengeQuestion[] = [
  {
    id: "q-01",
    prompt: "Which HTTP status best describes a successful resource creation?",
    options: ["200", "201", "204", "304"],
    correctIndex: 1,
    explanation: "201 Created signals that the request produced a new resource.",
  },
  {
    id: "q-02",
    prompt: "What does Git use to identify a commit?",
    options: ["A branch name", "A content hash", "A file timestamp", "A ticket number"],
    correctIndex: 1,
    explanation: "A commit is addressed by a cryptographic hash of its content and metadata.",
  },
  {
    id: "q-03",
    prompt: "Which data structure follows FIFO ordering?",
    options: ["Stack", "Queue", "Tree", "Set"],
    correctIndex: 1,
    explanation: "A queue processes the first item added before later items.",
  },
  {
    id: "q-04",
    prompt: "What is the main purpose of a database index?",
    options: ["Encrypt rows", "Speed up lookups", "Validate JSON", "Compress backups"],
    correctIndex: 1,
    explanation: "Indexes trade storage and write cost for faster query access paths.",
  },
  {
    id: "q-05",
    prompt: "Which CSS feature is designed for two-dimensional layout?",
    options: ["Float", "Grid", "Clear", "Outline"],
    correctIndex: 1,
    explanation: "CSS Grid coordinates rows and columns as a two-dimensional system.",
  },
  {
    id: "q-06",
    prompt: "What does idempotent mean for an API operation?",
    options: [
      "It always fails safely",
      "Repeating it has the same intended effect",
      "It requires authentication",
      "It runs asynchronously",
    ],
    correctIndex: 1,
    explanation: "An idempotent operation can be retried without multiplying its intended effect.",
  },
  {
    id: "q-07",
    prompt: "Which Git command creates a new branch and switches to it?",
    options: ["git merge -b", "git switch -c", "git pull -n", "git tag -s"],
    correctIndex: 1,
    explanation: "git switch -c <name> creates and checks out a branch.",
  },
  {
    id: "q-08",
    prompt: "What does a TypeScript union type express?",
    options: [
      "Every value at once",
      "One of several possible types",
      "Only numeric values",
      "A database relation",
    ],
    correctIndex: 1,
    explanation: "A union models a value that may be one of multiple declared types.",
  },
  {
    id: "q-09",
    prompt: "Which testing layer checks a complete user journey in a browser?",
    options: ["Unit", "Snapshot", "End-to-end", "Static analysis"],
    correctIndex: 2,
    explanation: "End-to-end tests exercise integrated user behavior through the running app.",
  },
  {
    id: "q-10",
    prompt: "What is the default port commonly used by HTTPS?",
    options: ["22", "53", "80", "443"],
    correctIndex: 3,
    explanation: "HTTPS conventionally listens on TCP port 443.",
  },
  {
    id: "q-11",
    prompt: "Which principle keeps a function focused on one reason to change?",
    options: ["DRY", "Single responsibility", "Event sourcing", "Memoization"],
    correctIndex: 1,
    explanation: "The single responsibility principle limits a unit to one cohesive concern.",
  },
  {
    id: "q-12",
    prompt: "What is a race condition?",
    options: [
      "A slow database query",
      "Behavior that depends on uncontrolled operation timing",
      "A failed type check",
      "A duplicated CSS selector",
    ],
    correctIndex: 1,
    explanation: "A race occurs when timing or ordering changes an otherwise shared result.",
  },
];
