# Setup guide: getting the Hostpointe agent team running

Plain-English steps. Each step says **what you do**, **why**, and **what you'll see**.

## Step 1: Create the GitHub repository
- **Do:** On github.com, click **New repository**. Name it `hostpointe`, choose **Private**, and don't add a README (we already have one). Click **Create**.
- **Why:** this is the shared folder in the cloud where all the agents' work is saved, with full history.
- **You'll see:** an empty repository page with an address like `github.com/enasyone/hostpointe`.

## Step 2: Put this starter kit into it
- **Do:** unzip `hostpointe-phase0-kit-v1.zip` on your computer, open a terminal in that folder, and run:
  ```bash
  git remote add origin https://github.com/enasyone/hostpointe.git   # tells git where the cloud copy lives
  git push -u origin main                                             # uploads everything
  ```
- **Why:** the kit already contains the team rules, decision log, backlog and agent files. Pushing it makes them the starting point for every agent.
- **You'll see:** your files listed on the GitHub page.

## Step 3: Create the Jira project
- **Do:** at jet.atlassian.net, click **Projects → Create project → Scrum** (Software). Name it **Hostpointe**, key **HPE**.
- **Why:** Jira is the official record. Once it exists, Uchenna (or I, from this chat) can fill it with the Phase 0 epics and stories.
- **You'll see:** an empty Scrum board.
- **Then:** in Jira, install the free **GitHub for Jira** app and connect the `hostpointe` repository, so code changes appear on Jira tickets.

## Step 4: Open Munder Difflin and point it at the repository
- **Do:** install and open Munder Difflin. Clone `hostpointe` to your computer and open that folder as the project.
- **Why:** Munder Difflin runs each agent as a real Claude Code or Codex session inside this folder.
- **Check first:** you're signed in to Claude Code (`claude`) and Codex (`codex`) on this computer, because each agent uses your own subscription.

## Step 5: Hire the Phase 0 team
- **Do:** in Munder Difflin, open **Add agent → import hire…** and import these files from `munder-difflin/hires/`, one at a time:
  1. `adaeze-tech-lead.hire.json`
  2. `uchenna-delivery-jira.hire.json`
  3. `segun-devops.hire.json`
  4. `babajide-qa-lead.hire.json` (Codex)
  5. `osaretin-compliance.hire.json` (on call)
- **Why:** each file pre-fills the agent's name, role, goal, tool (Claude Code or Codex) and token budget. Import never starts an agent by itself; you review each form and click **spawn**.
- **You'll see:** five avatars appear on the office floor. Michael (your clone) is the orchestrator who routes work between them.

## Step 6: Connect Jira for Uchenna
- **Do:** in Uchenna's Claude Code session, add the Atlassian connector (MCP, Model Context Protocol), for example with `claude mcp add` and Atlassian's remote server. Then sign in to jet.atlassian.net when asked.
- **Why:** this lets Uchenna create and update Jira tickets directly.

## Step 7: Give Michael the first instruction
Tell Michael:
> "Start Phase 0 using `docs/roadmap/PHASE0_BACKLOG.md`. Follow CLAUDE.md and AGENTS.md. Send me a daily summary and stop at the Phase 0 gate for my approval."

## Step 8: Phase 1 (later)
When Phase 0 is approved, import the other four hires: `chinedu-frontend`, `ibrahim-backend-db`, `amina-integrations-payments` and `obinna-security-a11y-perf`.

## Your own tasks (agents can't do these)
- Create the Azure account (UK South), then **upgrade it to pay-as-you-go within 30 days** to keep the 12-month free offers. Set a £10 budget alert.
- Apply to Microsoft for Startups for credits.
- Start Meta Business verification (for WhatsApp).
- Register with the NDPC (Nigeria Data Protection Commission) and the ICO (Information Commissioner's Office).
- Open Stripe and Paystack test accounts. Get the A1Pay API details from BTS (Blended Technology Solutions).
- Register hostpointe.co.uk and hostpointe.events, and run the trademark searches.
