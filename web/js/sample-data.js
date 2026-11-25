/**
 * ADMINATOR PULSE - Sample & Mock Datasets
 * Pre-populated enterprise data for employee engagement, surveys, kudos, calendar & analytics
 */

const SampleData = {
  // Demo User Personas for Login
  demoUsers: [
    {
      id: "user-1",
      name: "Alex Vance",
      email: "alex.vance@enterprise.io",
      role: "Head of People Ops",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      department: "HR & People",
      status: "Online"
    },
    {
      id: "user-2",
      name: "Sarah Jenkins",
      email: "sarah.jenkins@enterprise.io",
      role: "Lead DevOps Engineer",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      department: "Engineering",
      status: "In a Meeting"
    },
    {
      id: "user-3",
      name: "Maya Lin",
      email: "maya.lin@enterprise.io",
      role: "Lead Product Designer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      department: "Design",
      status: "Online"
    }
  ],

  // Key Metrics
  metrics: {
    enps: 68,
    enpsChange: "+6 pts vs last quarter",
    engagementIndex: 86.4,
    engagementIndexChange: "+3.2% vs target",
    pulseParticipation: 93.8,
    pulseParticipationChange: "+5.1% this cycle",
    kudosCount: 1420,
    kudosCountChange: "+18% this month",
    retentionHealth: 94.2
  },

  // Team and Social (formerly Kudos) Posts
  kudos: [
    {
      id: "kudos-1",
      senderName: "Marcus Vance",
      senderRole: "Staff Software Engineer",
      senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      recipientName: "Maya Lin",
      recipientRole: "Lead Product Designer",
      badge: "🎨 Creative Spark",
      coreValue: "#Innovation",
      message: "Huge shoutout to Maya for redesigning the onboarding flow in record time! The customer feedback has been overwhelmingly positive.",
      timestamp: "15 minutes ago",
      reactions: { clap: 14, heart: 8, rocket: 19, genius: 5 },
      userReacted: { rocket: true }
    },
    {
      id: "kudos-2",
      senderName: "Rachel Green",
      senderRole: "VP of People & Culture",
      senderAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
      recipientName: "Engineering Team",
      recipientRole: "Core Platform Squad",
      badge: "🚀 Mission Critical",
      coreValue: "#Teamwork",
      message: "Thank you all for zero-downtime database migration this weekend. Your cross-functional coordination was world-class!",
      timestamp: "2 hours ago",
      reactions: { clap: 32, heart: 24, rocket: 41, genius: 12 },
      userReacted: { heart: true }
    },
    {
      id: "kudos-3",
      senderName: "David Chen",
      senderRole: "Backend Architect",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      recipientName: "Priya Sharma",
      recipientRole: "Senior Solutions Engineer",
      badge: "🌟 Customer Champion",
      coreValue: "#CustomerFirst",
      message: "Priya went above and beyond to debug an enterprise customer API issue on Friday evening. True dedication!",
      timestamp: "5 hours ago",
      reactions: { clap: 18, heart: 11, rocket: 9, genius: 7 },
      userReacted: {}
    },
    {
      id: "kudos-4",
      senderName: "Elena Rostova",
      senderRole: "Principal Product Manager",
      senderAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
      recipientName: "Kevin Zhang",
      recipientRole: "Customer Success Lead",
      badge: "🤝 Empathy Award",
      coreValue: "#Collaboration",
      message: "Kevin's workshop on understanding client pain points gave the product squad incredible clarity for our 2027 roadmap.",
      timestamp: "Yesterday",
      reactions: { clap: 21, heart: 15, rocket: 12, genius: 4 },
      userReacted: {}
    }
  ],

  // Review and Survey (formerly Pulse & Surveys)
  surveys: [
    {
      id: "survey-1",
      title: "Q4 2026 Employee Well-Being & Work-Life Review",
      description: "A fast 3-minute pulse to assess workload balance, mental health support, and flexible working arrangements.",
      department: "All Company",
      deadline: "Ends in 3 days",
      participation: 88,
      status: "Active",
      totalTarget: 450,
      responses: 396
    },
    {
      id: "survey-2",
      title: "Manager Effectiveness & Career Growth Review",
      description: "Evaluating 1-on-1 quality, actionable feedback, and personal development opportunities.",
      department: "Product & Engineering",
      deadline: "Ends in 6 days",
      participation: 94,
      status: "Active",
      totalTarget: 180,
      responses: 169
    },
    {
      id: "survey-3",
      title: "Remote & Hybrid Collaboration Survey",
      description: "Gathering insights on meeting volume, async communication tools, and quarterly onsite gatherings.",
      department: "All Company",
      deadline: "Completed",
      participation: 96,
      status: "Closed",
      totalTarget: 450,
      responses: 432
    }
  ],

  // Calendar Meetings & Events Data
  calendarEvents: [
    {
      id: "evt-1",
      title: "1-on-1 Sync: Marcus Vance & Alex Vance",
      type: "1on1",
      typeLabel: "1-on-1 Sync",
      date: "2026-11-23",
      day: 23,
      time: "10:00 AM - 10:45 AM",
      platform: "Google Meet",
      platformIcon: "fa-solid fa-video",
      link: "https://meet.google.com/abc-defg-hij",
      attendees: ["Alex Vance", "Marcus Vance"],
      badgeClass: "badge-blue",
      notes: "Bi-weekly check-in on squad morale and sprint retrospectives."
    },
    {
      id: "evt-2",
      title: "Q4 Organizational Culture & eNPS Review",
      type: "townhall",
      typeLabel: "All-Hands Townhall",
      date: "2026-11-24",
      day: 24,
      time: "02:00 PM - 03:00 PM",
      platform: "Microsoft Teams",
      platformIcon: "fa-solid fa-users",
      link: "https://teams.microsoft.com/l/meetup-join/123",
      attendees: ["All Company"],
      badgeClass: "badge-purple",
      notes: "Executive presentation of Q4 engagement indices and wellness initiatives."
    },
    {
      id: "evt-3",
      title: "Engineering Psychological Safety Checkpoint",
      type: "pulse",
      typeLabel: "Team Pulse",
      date: "2026-11-25",
      day: 25,
      time: "11:30 AM - 12:15 PM",
      platform: "Google Meet",
      platformIcon: "fa-solid fa-video",
      link: "https://meet.google.com/eng-safe-q4",
      attendees: ["Engineering Squad Leads", "Sarah Jenkins"],
      badgeClass: "badge-teal",
      notes: "Open forum on reducing on-call stress and async code reviews."
    },
    {
      id: "evt-4",
      title: "1-on-1 Sync: Maya Lin & Alex Vance",
      type: "1on1",
      typeLabel: "1-on-1 Sync",
      date: "2026-11-26",
      day: 26,
      time: "03:30 PM - 04:15 PM",
      platform: "Zoom",
      platformIcon: "fa-solid fa-video",
      link: "https://zoom.us/j/987654321",
      attendees: ["Maya Lin", "Alex Vance"],
      badgeClass: "badge-blue",
      notes: "Career development mapping and design team growth goals."
    },
    {
      id: "evt-5",
      title: "Design & Product Innovation Jam",
      type: "workshop",
      typeLabel: "Culture Workshop",
      date: "2026-11-27",
      day: 27,
      time: "01:00 PM - 02:30 PM",
      platform: "Microsoft Teams",
      platformIcon: "fa-solid fa-lightbulb",
      link: "https://teams.microsoft.com/l/meetup-join/456",
      attendees: ["Maya Lin", "Elena Rostova", "Alex Rivera"],
      badgeClass: "badge-amber",
      notes: "Collaborative design sprint on next year's internal knowledge base."
    }
  ],

  // Employee Directory
  employees: [
    {
      id: "EMP-101",
      name: "Sarah Jenkins",
      role: "Lead DevOps Engineer",
      department: "Engineering",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      score: 94,
      risk: "Low",
      enps: 9,
      tenure: "3.5 yrs",
      lastOneOnOne: "Nov 14, 2026"
    },
    {
      id: "EMP-102",
      name: "David Chen",
      role: "Backend Architect",
      department: "Engineering",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      score: 86,
      risk: "Low",
      enps: 8,
      tenure: "2.1 yrs",
      lastOneOnOne: "Nov 18, 2026"
    },
    {
      id: "EMP-103",
      name: "Marcus Vance",
      role: "Staff Software Engineer",
      department: "Engineering",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      score: 72,
      risk: "Medium",
      enps: 6,
      tenure: "4.0 yrs",
      lastOneOnOne: "Nov 02, 2026"
    },
    {
      id: "EMP-104",
      name: "Elena Rostova",
      role: "Principal Product Manager",
      department: "Product",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
      score: 91,
      risk: "Low",
      enps: 10,
      tenure: "1.8 yrs",
      lastOneOnOne: "Nov 19, 2026"
    },
    {
      id: "EMP-105",
      name: "Liam O'Connor",
      role: "Senior Product Analyst",
      department: "Product",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      score: 88,
      risk: "Low",
      enps: 8,
      tenure: "5.2 yrs",
      lastOneOnOne: "Nov 10, 2026"
    },
    {
      id: "EMP-106",
      name: "Maya Lin",
      role: "Lead Product Designer",
      department: "Design",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      score: 96,
      risk: "Low",
      enps: 10,
      tenure: "2.4 yrs",
      lastOneOnOne: "Nov 17, 2026"
    },
    {
      id: "EMP-107",
      name: "Alex Rivera",
      role: "Brand & Motion Designer",
      department: "Design",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
      score: 89,
      risk: "Low",
      enps: 9,
      tenure: "3.0 yrs",
      lastOneOnOne: "Nov 12, 2026"
    },
    {
      id: "EMP-108",
      name: "Chloe Bennett",
      role: "Growth Marketing Manager",
      department: "Marketing",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      score: 78,
      risk: "Medium",
      enps: 7,
      tenure: "1.2 yrs",
      lastOneOnOne: "Nov 08, 2026"
    },
    {
      id: "EMP-109",
      name: "Jordan Taylor",
      role: "Content & Communications Lead",
      department: "Marketing",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
      score: 85,
      risk: "Low",
      enps: 8,
      tenure: "2.8 yrs",
      lastOneOnOne: "Nov 15, 2026"
    },
    {
      id: "EMP-110",
      name: "Tyson Brooks",
      role: "Enterprise Account Executive",
      department: "Sales",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
      score: 68,
      risk: "High",
      enps: 5,
      tenure: "0.9 yrs",
      lastOneOnOne: "Oct 29, 2026"
    },
    {
      id: "EMP-111",
      name: "Priya Sharma",
      role: "Senior Solutions Engineer",
      department: "Sales",
      avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=100&auto=format&fit=crop&q=80",
      score: 84,
      risk: "Low",
      enps: 8,
      tenure: "3.1 yrs",
      lastOneOnOne: "Nov 16, 2026"
    },
    {
      id: "EMP-113",
      name: "Rachel Green",
      role: "VP of People & Culture",
      department: "HR & People",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
      score: 95,
      risk: "Low",
      enps: 10,
      tenure: "4.5 yrs",
      lastOneOnOne: "Nov 20, 2026"
    },
    {
      id: "EMP-115",
      name: "Aisha Patel",
      role: "Customer Support Specialist",
      department: "Customer Support",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
      score: 74,
      risk: "High",
      enps: 6,
      tenure: "1.1 yrs",
      lastOneOnOne: "Nov 03, 2026"
    },
    {
      id: "EMP-118",
      name: "Brandon Cole",
      role: "Financial Planning Director",
      department: "Finance",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80",
      score: 87,
      risk: "Low",
      enps: 8,
      tenure: "6.0 yrs",
      lastOneOnOne: "Nov 11, 2026"
    }
  ],

  // Built-in Sample Datasets for Document Analytics
  sampleDatasets: {
    departmentEngagement: {
      name: "Department_Engagement_Scores_2026.xlsx",
      type: "xlsx",
      size: "24.5 KB",
      rows: 7,
      columns: ["Department", "Headcount", "Engagement_Score", "eNPS_Score", "Participation_Rate", "Attrition_Risk_Index"],
      data: [
        { Department: "Engineering", Headcount: 85, Engagement_Score: 89.4, eNPS_Score: 68, Participation_Rate: 94.2, Attrition_Risk_Index: 12.0 },
        { Department: "Product", Headcount: 32, Engagement_Score: 91.2, eNPS_Score: 74, Participation_Rate: 96.0, Attrition_Risk_Index: 8.5 },
        { Department: "Design", Headcount: 18, Engagement_Score: 94.6, eNPS_Score: 82, Participation_Rate: 98.5, Attrition_Risk_Index: 5.2 },
        { Department: "Marketing", Headcount: 28, Engagement_Score: 81.5, eNPS_Score: 54, Participation_Rate: 88.0, Attrition_Risk_Index: 18.4 },
        { Department: "Sales", Headcount: 45, Engagement_Score: 74.2, eNPS_Score: 38, Participation_Rate: 84.5, Attrition_Risk_Index: 26.8 },
        { Department: "HR & Culture", Headcount: 14, Engagement_Score: 95.8, eNPS_Score: 88, Participation_Rate: 100.0, Attrition_Risk_Index: 4.1 },
        { Department: "Customer Support", Headcount: 38, Engagement_Score: 77.0, eNPS_Score: 42, Participation_Rate: 89.2, Attrition_Risk_Index: 22.5 }
      ]
    },
    quarterlySentiment: {
      name: "Quarterly_Sentiment_Breakdown.csv",
      type: "csv",
      size: "18.2 KB",
      rows: 11,
      columns: ["Month", "Overall_Satisfaction", "eNPS", "Participation_Rate", "Resolved_Concerns"],
      data: [
        { Month: "Jan", Overall_Satisfaction: 78.4, eNPS: 42, Participation_Rate: 82.5, Resolved_Concerns: 280 },
        { Month: "Feb", Overall_Satisfaction: 79.8, eNPS: 45, Participation_Rate: 85.0, Resolved_Concerns: 315 },
        { Month: "Mar", Overall_Satisfaction: 81.2, eNPS: 48, Participation_Rate: 87.2, Resolved_Concerns: 350 },
        { Month: "Apr", Overall_Satisfaction: 82.0, eNPS: 50, Participation_Rate: 88.6, Resolved_Concerns: 375 },
        { Month: "May", Overall_Satisfaction: 83.5, eNPS: 54, Participation_Rate: 89.1, Resolved_Concerns: 395 },
        { Month: "Jun", Overall_Satisfaction: 84.1, eNPS: 56, Participation_Rate: 91.0, Resolved_Concerns: 420 },
        { Month: "Jul", Overall_Satisfaction: 84.8, eNPS: 58, Participation_Rate: 90.4, Resolved_Concerns: 435 },
        { Month: "Aug", Overall_Satisfaction: 85.2, eNPS: 60, Participation_Rate: 91.8, Resolved_Concerns: 455 },
        { Month: "Sep", Overall_Satisfaction: 86.0, eNPS: 62, Participation_Rate: 92.5, Resolved_Concerns: 485 },
        { Month: "Oct", Overall_Satisfaction: 87.4, eNPS: 66, Participation_Rate: 93.8, Resolved_Concerns: 512 },
        { Month: "Nov", Overall_Satisfaction: 88.6, eNPS: 69, Participation_Rate: 94.2, Resolved_Concerns: 548 }
      ]
    },
    nlpCultureReport: {
      name: "Executive_Culture_Audit_2026.pdf",
      type: "pdf",
      size: "1.4 MB",
      rows: 8,
      columns: ["Theme_Category", "Positive_Mentions", "Neutral_Mentions", "Negative_Mentions", "Net_Sentiment_Ratio"],
      data: [
        { Theme_Category: "Team Collaboration", Positive_Mentions: 420, Neutral_Mentions: 85, Negative_Mentions: 22, Net_Sentiment_Ratio: 88.2 },
        { Theme_Category: "Leadership Vision", Positive_Mentions: 340, Neutral_Mentions: 110, Negative_Mentions: 48, Net_Sentiment_Ratio: 76.5 },
        { Theme_Category: "Work-Life Balance", Positive_Mentions: 295, Neutral_Mentions: 95, Negative_Mentions: 64, Net_Sentiment_Ratio: 69.8 },
        { Theme_Category: "Career Development", Positive_Mentions: 310, Neutral_Mentions: 120, Negative_Mentions: 55, Net_Sentiment_Ratio: 72.4 },
        { Theme_Category: "Compensation & Benefits", Positive_Mentions: 240, Neutral_Mentions: 140, Negative_Mentions: 88, Net_Sentiment_Ratio: 58.1 },
        { Theme_Category: "Tooling & Tech Stack", Positive_Mentions: 390, Neutral_Mentions: 70, Negative_Mentions: 30, Net_Sentiment_Ratio: 84.6 },
        { Theme_Category: "Diversity & Inclusion", Positive_Mentions: 450, Neutral_Mentions: 40, Negative_Mentions: 15, Net_Sentiment_Ratio: 92.4 },
        { Theme_Category: "Meeting Culture", Positive_Mentions: 210, Neutral_Mentions: 105, Negative_Mentions: 98, Net_Sentiment_Ratio: 51.2 }
      ]
    }
  },

  // Dynamic Notifications Center Data
  notifications: [
    {
      id: "notif-1",
      title: "New Review and Survey Launched",
      message: "Q4 2026 Employee Well-Being & Work-Life Review is now open for your team.",
      time: "10m ago",
      type: "survey",
      icon: "fa-solid fa-square-poll-vertical",
      read: false,
      url: "surveys.html"
    },
    {
      id: "notif-2",
      title: "Kudos Received from Marcus",
      message: "Marcus Vance sent you the 'Creative Spark' badge for outstanding work.",
      time: "25m ago",
      type: "kudo",
      icon: "fa-solid fa-award",
      read: false,
      url: "kudos.html"
    },
    {
      id: "notif-3",
      title: "Calendar Sync: Upcoming 1-on-1",
      message: "Weekly Mentorship & Coaching with Priya Sharma starts in 45 minutes.",
      time: "1h ago",
      type: "calendar",
      icon: "fa-solid fa-calendar-check",
      read: false,
      url: "calendar.html"
    }
  ]
};
