import type { AuditState, Tool } from "./types";

/**
 * The tool catalog used in the onboarding. `domain` powers the brand logo,
 * `ecosystem` links native M365 / Google Workspace apps to that hub.
 */
export const TOOL_CATALOG: Tool[] = [
  // Microsoft 365 native
  { id: "outlook", name: "Outlook", category: "Comms", ecosystem: "microsoft", domain: "outlook.com" },
  { id: "teams", name: "Microsoft Teams", category: "Comms", ecosystem: "microsoft", domain: "teams.microsoft.com" },
  { id: "sharepoint", name: "SharePoint", category: "Storage", ecosystem: "microsoft", domain: "sharepoint.com" },
  { id: "onedrive", name: "OneDrive", category: "Storage", ecosystem: "microsoft", domain: "onedrive.com" },
  { id: "excel", name: "Excel", category: "Productivity", ecosystem: "microsoft", domain: "microsoft.com" },
  { id: "word", name: "Word", category: "Productivity", ecosystem: "microsoft", domain: "microsoft.com" },
  { id: "powerpoint", name: "PowerPoint", category: "Productivity", ecosystem: "microsoft", domain: "microsoft.com" },
  { id: "powerbi", name: "Power BI", category: "Data", ecosystem: "microsoft", domain: "powerbi.microsoft.com" },

  // Google Workspace native
  { id: "gmail", name: "Gmail", category: "Comms", ecosystem: "google", domain: "gmail.com" },
  { id: "gmeet", name: "Google Meet", category: "Comms", ecosystem: "google", domain: "meet.google.com" },
  { id: "gdrive", name: "Google Drive", category: "Storage", ecosystem: "google", domain: "drive.google.com" },
  { id: "gsheets", name: "Google Sheets", category: "Productivity", ecosystem: "google", domain: "sheets.google.com" },
  { id: "gdocs", name: "Google Docs", category: "Productivity", ecosystem: "google", domain: "docs.google.com" },
  { id: "gslides", name: "Google Slides", category: "Productivity", ecosystem: "google", domain: "slides.google.com" },
  { id: "looker", name: "Looker Studio", category: "Data", ecosystem: "google", domain: "lookerstudio.google.com" },

  // Comms
  { id: "slack", name: "Slack", category: "Comms", domain: "slack.com" },
  { id: "zoom", name: "Zoom", category: "Comms", domain: "zoom.us" },
  { id: "discord", name: "Discord", category: "Comms", domain: "discord.com" },
  { id: "twilio", name: "Twilio", category: "Comms", domain: "twilio.com" },
  { id: "aircall", name: "Aircall", category: "Comms", domain: "aircall.io" },

  // CRM & Sales
  { id: "salesforce", name: "Salesforce", category: "CRM & Sales", domain: "salesforce.com" },
  { id: "hubspot", name: "HubSpot", category: "CRM & Sales", domain: "hubspot.com" },
  { id: "pipedrive", name: "Pipedrive", category: "CRM & Sales", domain: "pipedrive.com" },
  { id: "zoho", name: "Zoho CRM", category: "CRM & Sales", domain: "zoho.com" },
  { id: "gong", name: "Gong", category: "CRM & Sales", domain: "gong.io" },
  { id: "apollo", name: "Apollo", category: "CRM & Sales", domain: "apollo.io" },

  // Finance
  { id: "xero", name: "Xero", category: "Finance", domain: "xero.com" },
  { id: "quickbooks", name: "QuickBooks", category: "Finance", domain: "quickbooks.intuit.com" },
  { id: "stripe", name: "Stripe", category: "Finance", domain: "stripe.com" },
  { id: "myob", name: "MYOB", category: "Finance", domain: "myob.com" },
  { id: "ramp", name: "Ramp", category: "Finance", domain: "ramp.com" },

  // Marketing
  { id: "mailchimp", name: "Mailchimp", category: "Marketing", domain: "mailchimp.com" },
  { id: "klaviyo", name: "Klaviyo", category: "Marketing", domain: "klaviyo.com" },
  { id: "meta-ads", name: "Meta Ads", category: "Marketing", domain: "meta.com" },
  { id: "google-ads", name: "Google Ads", category: "Marketing", domain: "ads.google.com" },
  { id: "canva", name: "Canva", category: "Marketing", domain: "canva.com" },
  { id: "hootsuite", name: "Hootsuite", category: "Marketing", domain: "hootsuite.com" },
  { id: "semrush", name: "Semrush", category: "Marketing", domain: "semrush.com" },

  // Project & Ops
  { id: "notion", name: "Notion", category: "Project & Ops", domain: "notion.so" },
  { id: "asana", name: "Asana", category: "Project & Ops", domain: "asana.com" },
  { id: "jira", name: "Jira", category: "Project & Ops", domain: "atlassian.com" },
  { id: "confluence", name: "Confluence", category: "Project & Ops", domain: "atlassian.com" },
  { id: "monday", name: "Monday.com", category: "Project & Ops", domain: "monday.com" },
  { id: "trello", name: "Trello", category: "Project & Ops", domain: "trello.com" },
  { id: "clickup", name: "ClickUp", category: "Project & Ops", domain: "clickup.com" },
  { id: "linear", name: "Linear", category: "Project & Ops", domain: "linear.app" },
  { id: "airtable", name: "Airtable", category: "Project & Ops", domain: "airtable.com" },

  // Support
  { id: "zendesk", name: "Zendesk", category: "Support", domain: "zendesk.com" },
  { id: "intercom", name: "Intercom", category: "Support", domain: "intercom.com" },
  { id: "freshdesk", name: "Freshdesk", category: "Support", domain: "freshworks.com" },
  { id: "helpscout", name: "Help Scout", category: "Support", domain: "helpscout.com" },

  // Data
  { id: "snowflake", name: "Snowflake", category: "Data", domain: "snowflake.com" },
  { id: "tableau", name: "Tableau", category: "Data", domain: "tableau.com" },
  { id: "segment", name: "Segment", category: "Data", domain: "segment.com" },

  // Storage
  { id: "dropbox", name: "Dropbox", category: "Storage", domain: "dropbox.com" },
  { id: "box", name: "Box", category: "Storage", domain: "box.com" },

  // HR
  { id: "bamboohr", name: "BambooHR", category: "HR", domain: "bamboohr.com" },
  { id: "gusto", name: "Gusto", category: "HR", domain: "gusto.com" },
  { id: "deel", name: "Deel", category: "HR", domain: "deel.com" },
  { id: "rippling", name: "Rippling", category: "HR", domain: "rippling.com" },

  // Other / Dev / Commerce
  { id: "github", name: "GitHub", category: "Other", domain: "github.com" },
  { id: "gitlab", name: "GitLab", category: "Other", domain: "gitlab.com" },
  { id: "shopify", name: "Shopify", category: "Other", domain: "shopify.com" },
  { id: "zapier", name: "Zapier", category: "Other", domain: "zapier.com" },
  { id: "make", name: "Make", category: "Other", domain: "make.com" },
];

export const TOOL_BY_ID: Record<string, Tool> = Object.fromEntries(
  TOOL_CATALOG.map((t) => [t.id, t]),
);

/** Suggested departments to seed step 3. */
export const DEPARTMENT_SUGGESTIONS = [
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "Customer Support",
  "Product & Engineering",
  "People & HR",
  "Leadership",
];

export const CATEGORY_ORDER: Tool["category"][] = [
  "Productivity",
  "Comms",
  "CRM & Sales",
  "Finance",
  "Marketing",
  "Project & Ops",
  "Support",
  "Data",
  "Storage",
  "HR",
  "Other",
];

/** The context that lives inside each kind of tool (used to branch sub-nodes). */
export const CONTEXT_BY_CATEGORY: Record<Tool["category"], string[]> = {
  Productivity: ["Documents", "Spreadsheets", "Folders", "Templates", "Comments", "Versions", "Shares", "Tables", "Charts", "Formulas", "Tabs", "Mentions", "Tasks", "Links", "Exports", "Permissions", "History", "Tags", "Attachments", "Notes"],
  Comms: ["Messages", "Threads", "Channels", "Calls", "Meetings", "Recordings", "Files", "Contacts", "Mentions", "Reactions", "Notifications", "Groups", "Status", "Search", "Voicemail", "Transcripts", "Bots", "Reminders", "Pins", "Integrations"],
  "CRM & Sales": ["Leads", "Deals", "Contacts", "Accounts", "Pipelines", "Activities", "Tasks", "Notes", "Emails", "Calls", "Meetings", "Forecasts", "Quotes", "Reports", "Dashboards", "Sequences", "Tags", "Owners", "Stages", "Sources"],
  Finance: ["Invoices", "Payments", "Customers", "Expenses", "Reports", "Transactions", "Taxes", "Payroll", "Budgets", "Refunds", "Subscriptions", "Accounts", "Statements", "Reconciliation", "Bills", "Quotes", "Receipts", "Ledgers", "Forecasts", "Audit trail"],
  Marketing: ["Campaigns", "Audiences", "Segments", "Emails", "Ads", "Creatives", "Landing pages", "Forms", "Reports", "Analytics", "Automations", "Templates", "Lists", "Tags", "Conversions", "Budgets", "Keywords", "Social posts", "A/B tests", "Brand assets"],
  "Project & Ops": ["Projects", "Tasks", "Boards", "Sprints", "Backlogs", "Milestones", "Docs", "Comments", "Assignees", "Due dates", "Tags", "Workflows", "Automations", "Reports", "Time tracking", "Dependencies", "Files", "Templates", "Views", "Statuses"],
  Support: ["Tickets", "Conversations", "Customers", "Macros", "SLAs", "Queues", "Tags", "Articles", "Knowledge base", "Reports", "CSAT", "Channels", "Automations", "Triggers", "Agents", "Groups", "Escalations", "Attachments", "History", "Chat"],
  Data: ["Datasets", "Tables", "Dashboards", "Reports", "Metrics", "Queries", "Pipelines", "Models", "Schemas", "Sources", "Charts", "Filters", "Views", "Permissions", "Refreshes", "Alerts", "Exports", "Warehouses", "Events", "Segments"],
  Storage: ["Files", "Folders", "Documents", "Shares", "Permissions", "Versions", "Links", "Trash", "Tags", "Comments", "Sites", "Libraries", "Backups", "Sync", "Search", "Previews", "Uploads", "Owners", "Activity", "Labels"],
  HR: ["Employees", "Payroll", "Leave", "Onboarding", "Documents", "Reviews", "Time off", "Benefits", "Contracts", "Org chart", "Policies", "Expenses", "Roles", "Departments", "Reports", "Approvals", "Records", "Surveys", "Offboarding", "Compliance"],
  Other: ["Repos", "Issues", "Pull requests", "Branches", "Commits", "Pipelines", "Actions", "Releases", "Docs", "Wikis", "Members", "Webhooks", "Tokens", "Projects", "Stars", "Forks", "Reviews", "Tags", "Environments", "Secrets"],
};

/** Tool-specific context overrides for marquee platforms. */
export const CONTEXT_BY_TOOL: Record<string, string[]> = {
  stripe: ["Payments", "Customers", "Invoices", "Subscriptions", "Refunds", "Payouts", "Disputes", "Charges", "Balance", "Products", "Prices", "Coupons", "Checkout", "Payment links", "Webhooks", "Tax rates", "Connect", "Fraud rules", "Receipts", "Reporting"],
  mailchimp: ["Campaigns", "Audiences", "Segments", "Tags", "Automations", "Templates", "Landing pages", "Forms", "Reports", "Subscribers", "Unsubscribes", "A/B tests", "Journeys", "Merge fields", "Send times", "Open rates", "Click rates", "Deliverability", "Integrations", "Brand assets"],
  hubspot: ["Contacts", "Companies", "Deals", "Tickets", "Pipelines", "Workflows", "Sequences", "Forms", "Landing pages", "Lists", "Properties", "Reports", "Tasks", "Meetings", "Calls", "Notes", "Quotes", "Products", "Campaigns", "Dashboards"],
  salesforce: ["Leads", "Accounts", "Contacts", "Opportunities", "Cases", "Campaigns", "Reports", "Dashboards", "Tasks", "Pipelines", "Forecasts", "Products", "Quotes", "Contracts", "Activities", "Workflows", "Custom objects", "Permissions", "Territories", "Notes"],
  slack: ["Channels", "DMs", "Threads", "Files", "Huddles", "Apps", "Workflows", "Reminders", "Pins", "Mentions", "Reactions", "Canvases", "User groups", "Integrations", "Search", "Shared channels", "Bots", "Snippets", "Status", "Notifications"],
  notion: ["Pages", "Databases", "Wikis", "Docs", "Tasks", "Projects", "Templates", "Comments", "Mentions", "Properties", "Views", "Relations", "Sub-pages", "Tags", "Reminders", "Integrations", "Backlinks", "Files", "Teamspaces", "History"],
  xero: ["Invoices", "Bills", "Contacts", "Bank feeds", "Reports", "Payroll", "Expenses", "Quotes", "Purchase orders", "Inventory", "Tax", "Reconciliation", "Chart of accounts", "Budgets", "Fixed assets", "Journals", "Statements", "Payments", "Credit notes", "GST"],
  shopify: ["Products", "Orders", "Customers", "Collections", "Inventory", "Discounts", "Checkout", "Abandoned carts", "Reports", "Fulfilment", "Refunds", "Gift cards", "Analytics", "Themes", "Apps", "Shipping", "Taxes", "Reviews", "Marketing", "Draft orders"],
};

/** Returns the context labels for a tool (tool-specific override or category list). */
export function contextFor(tool: Tool): string[] {
  return CONTEXT_BY_TOOL[tool.id] ?? CONTEXT_BY_CATEGORY[tool.category] ?? [];
}

/** A rich, pre-filled example so the graph looks impressive instantly. */
export const EXAMPLE_AUDIT: AuditState = {
  company: "Northwind Group",
  ecosystem: "both",
  toolIds: [
    "outlook", "teams", "sharepoint", "onedrive", "excel", "powerbi",
    "gmail", "gdrive", "gsheets", "looker",
    "slack", "zoom", "aircall",
    "salesforce", "hubspot", "pipedrive", "gong", "apollo",
    "xero", "stripe", "ramp",
    "mailchimp", "klaviyo", "meta-ads", "google-ads", "canva",
    "notion", "asana", "jira", "confluence", "linear", "airtable",
    "zendesk", "intercom",
    "snowflake", "tableau", "segment",
    "dropbox", "github", "shopify", "zapier",
    "bamboohr", "gusto",
  ],
  departments: [
    { id: "sales", name: "Sales", toolIds: ["salesforce", "hubspot", "pipedrive", "gong", "apollo", "slack", "outlook", "aircall", "zoom", "gsheets", "notion", "gmail"] },
    { id: "marketing", name: "Marketing", toolIds: ["hubspot", "mailchimp", "klaviyo", "meta-ads", "google-ads", "canva", "notion", "slack", "gdrive", "zoom", "gsheets", "shopify", "gmail"] },
    { id: "finance", name: "Finance", toolIds: ["xero", "stripe", "ramp", "excel", "powerbi", "outlook", "sharepoint", "slack", "gsheets", "notion", "onedrive"] },
    { id: "ops", name: "Operations", toolIds: ["asana", "airtable", "notion", "slack", "zapier", "sharepoint", "gsheets", "outlook", "zoom", "dropbox", "shopify", "teams"] },
    { id: "support", name: "Customer Support", toolIds: ["zendesk", "intercom", "slack", "aircall", "notion", "hubspot", "gdrive", "zoom"] },
    { id: "product", name: "Product & Engineering", toolIds: ["jira", "confluence", "linear", "github", "slack", "notion", "segment", "zoom", "gsheets", "dropbox"] },
    { id: "data", name: "Data & Analytics", toolIds: ["snowflake", "tableau", "looker", "powerbi", "segment", "gsheets", "slack", "notion", "excel"] },
    { id: "people", name: "People & HR", toolIds: ["bamboohr", "gusto", "teams", "outlook", "sharepoint", "slack", "notion", "zoom", "onedrive"] },
  ],
};
