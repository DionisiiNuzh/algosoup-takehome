import type { Issue } from "../types";
export const demoIssues: Issue[] = [
  {
    id: "access",
    title: "Getting locked out after the latest update",
    category: "Account & access",
    color: "purple",
    ratio: 0.34,
    summary:
      "Reviewers report sign-in loops and unexpected logouts after updating.",
    action:
      "Investigate session persistence and the sign-in flow after an app update.",
    reviews: [
      [
        "“Since the update I have to sign in every time. Sometimes it just takes me back to the login screen.”",
        1,
        "Oct 28, 2026",
      ],
      [
        "“Love the app when it works, but I keep getting logged out halfway through using it.”",
        2,
        "Oct 27, 2026",
      ],
    ],
  },
  {
    id: "performance",
    title: "Slow loading gets in the way of everyday use",
    category: "Performance",
    color: "orange",
    ratio: 0.27,
    summary: "Long loading times and frozen screens interrupt common tasks.",
    action:
      "Measure startup latency and investigate reported freezes on lower-end devices.",
    reviews: [
      [
        "“The home screen takes forever to load. I end up closing it and trying again.”",
        2,
        "Oct 29, 2026",
      ],
      [
        "“It freezes whenever I switch between tabs. Please make it faster.”",
        2,
        "Oct 26, 2026",
      ],
    ],
  },
  {
    id: "notifications",
    title: "Notifications arrive late or don’t arrive at all",
    category: "Notifications",
    color: "blue",
    ratio: 0.18,
    summary:
      "People miss important updates despite having notifications enabled.",
    action:
      "Trace notification delivery and check permission handling across Android versions.",
    reviews: [
      [
        "“Notifications are turned on but I only see updates when I open the app.”",
        2,
        "Oct 28, 2026",
      ],
      [
        "“The reminders used to work. Now they show up hours late.”",
        3,
        "Oct 25, 2026",
      ],
    ],
  },
  {
    id: "navigation",
    title: "Key features are harder to find after the redesign",
    category: "Usability",
    color: "green",
    ratio: 0.12,
    summary: "The new navigation makes familiar actions difficult to discover.",
    action:
      "Review navigation paths for frequently used features and validate discoverability.",
    reviews: [
      [
        "“Where did my saved items go? It took me ten minutes to find them in the new layout.”",
        3,
        "Oct 27, 2026",
      ],
      [
        "“Looks nice but I can’t find the settings I used every day.”",
        2,
        "Oct 24, 2026",
      ],
    ],
  },
];

export const processingSamples = [
  ["AM", "Appreciate the design, but sign-in keeps looping."],
  ["KL", "The home screen takes a long time to load."],
  ["JR", "My reminders only appear when I open the app."],
  ["TS", "Finding my saved items is confusing now."],
  ["DC", "A really useful app. Hoping the next update fixes the lag."],
];
