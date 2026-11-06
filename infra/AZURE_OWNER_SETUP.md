# Azure owner setup: steps for Enahoro before handing over to Segun (DevOps)

You already have an Azure account. These steps prepare it so Segun Oladipo (DevOps (Development and Operations) and Cloud Engineer) can build Hostpointe's cloud setup safely. **Never paste passwords, keys or secrets into chat, Jira or code.** The setup below needs no passwords at all.

Do steps 1–9 yourself. They take about 45 minutes. Step 10 is the handover.

---

## Step 1: Decide where Hostpointe lives (a separate subscription is recommended)
- **What:** in the Azure portal, go to **Subscriptions**. Either create a new subscription called `Hostpointe` (best) or pick an existing one.
- **Why:** a subscription is like a separate bank account for cloud spending. Keeping Hostpointe separate means its costs, permissions and clean-up never mix with your other projects.
- **You'll see:** a subscription name and a **Subscription ID** (a long code). Copy the ID into your notes.

## Step 2: Check what's free on your account
- **What:** **Cost Management → Credits + commitments** (or **Free services**, if shown).
- **Why:** Azure's 12-month free offers (free PostgreSQL B1MS, 5 GB Blob Storage, Key Vault transactions) are **for new customers only**, so an existing account usually doesn't get them. The **always-free** allowances still apply:
  - Container Apps (180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests a month)
  - Functions (1 million requests)
  - Static Web Apps
  - Entra External ID (up to 50,000 monthly active users)
  - AI Speech free tier
- **Decision for you:** the database is the one paid item. Choose one:
  - **(a)** Azure PostgreSQL Flexible Server B1MS, the smallest paid size. Simple and all-Azure.
  - **(b)** A free external Postgres (for example Neon's free tier) for development and the pilot, moving to Azure at launch.

  Tell Segun which one you chose.

## Step 3: Set a budget alert (do this before anything else is created)
- **What:** **Cost Management → Budgets → Add**. Scope: the Hostpointe subscription. Amount: **£10 per month**. Alerts at **50%, 80% and 100%**, sent to your email.
- **Why:** it's a smoke alarm for spending. If anything starts costing money unexpectedly, you're told straight away.
- **You'll see:** the budget listed, showing £0 spent.

## Step 4: Create three resource groups in UK South
- **What:** **Resource groups → Create**, three times, all with region **UK South**:
  - `rg-hostpointe-dev`
  - `rg-hostpointe-staging`
  - `rg-hostpointe-prod`

  Add the tags `project=hostpointe`, `owner=datapointe`, and `env=dev`, `staging` or `prod` to match each group.
- **Why:** a resource group is a labelled folder for cloud resources. Separate folders mean a mistake in testing can never touch the live system, and costs show per environment.

## Step 5: Turn on the Azure services we'll use (register resource providers)
- **What:** in the subscription, open **Resource providers** and click **Register** for each of these:
  `Microsoft.App`, `Microsoft.OperationalInsights`, `Microsoft.Insights`, `Microsoft.DBforPostgreSQL`, `Microsoft.KeyVault`, `Microsoft.Storage`, `Microsoft.Web`, `Microsoft.Communication`, `Microsoft.ManagedIdentity`.
- **Why:** Azure keeps some services switched off until you enable them. Doing it now prevents "provider not registered" errors when Segun deploys.

## Step 6 (optional, recommended): Lock the region to UK South
- **What:** **Policy → Assignments → Assign policy** → "Allowed locations". Scope: the Hostpointe subscription. Allowed: **UK South** (plus **Global**, which some services need).
- **Why:** it stops anything being created in the wrong country by accident, which matters for data protection.

## Step 7: Let GitHub deploy without a password (OIDC (OpenID Connect) federation)
This lets GitHub Actions (the automatic build pipeline) sign in to Azure using a short-lived token instead of a stored password.

**Option A: Azure portal**
1. **Microsoft Entra ID → App registrations → New registration**. Name it `hostpointe-github-deployer` and click **Register**. Copy the **Application (client) ID** and the **Directory (tenant) ID**.
2. In that app, open **Certificates & secrets → Federated credentials → Add credential**, choose **GitHub Actions deploying Azure resources**, and fill in:
   - Organization: `enasyone`, Repository: `hostpointe`, Entity type: **Environment**, Environment name: `staging`. Name it `github-staging`.
   - Repeat for the environments `dev` and `production`.
3. Give it permission to deploy, but only into the Hostpointe folders. For each resource group (`rg-hostpointe-dev`, `-staging`, `-prod`), open **Access control (IAM) → Add role assignment**, choose **Contributor**, then select the app `hostpointe-github-deployer`.

**Option B: Azure Cloud Shell** (the terminal icon at the top of the portal)
```bash
# 1. Create the deployer identity (an "app" that GitHub will act as)
az ad app create --display-name hostpointe-github-deployer
APP_ID=$(az ad app list --display-name hostpointe-github-deployer --query "[0].appId" -o tsv)
az ad sp create --id $APP_ID                      # makes it usable for permissions

# 2. Trust GitHub's "staging" environment for this repository (no password involved)
az ad app federated-credential create --id $APP_ID --parameters '{
  "name":"github-staging",
  "issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:enasyone/hostpointe:environment:staging",
  "audiences":["api://AzureADTokenExchange"]}'
# repeat with "dev" and "production" in place of "staging"

# 3. Allow it to deploy only into the Hostpointe resource groups
SUB=$(az account show --query id -o tsv)
for RG in rg-hostpointe-dev rg-hostpointe-staging rg-hostpointe-prod; do
  az role assignment create --assignee $APP_ID --role Contributor \
    --scope /subscriptions/$SUB/resourceGroups/$RG
done
echo "Client ID: $APP_ID   Tenant ID: $(az account show --query tenantId -o tsv)   Subscription ID: $SUB"
```
- **Why:** the pipeline can deploy Hostpointe, but it can't see or change anything else in your Azure, and there's no secret that could leak.

## Step 8: Put the three IDs into GitHub (they are IDs, not secrets)
- **What:** at github.com/enasyone/hostpointe, go to **Settings → Environments**:
  1. Create the environments `dev`, `staging` and `production`. On **production**, tick **Required reviewers** and add yourself, so nothing reaches live without your approval.
  2. Under **Settings → Secrets and variables → Actions → Variables**, add:
     - `AZURE_CLIENT_ID`: the Application (client) ID from step 7
     - `AZURE_TENANT_ID`: the Directory (tenant) ID
     - `AZURE_SUBSCRIPTION_ID`: from step 1
- **Why:** the pipeline needs to know which Azure account and identity to use. These IDs aren't passwords. The trust set up in step 7 is what keeps it secure.

## Step 9: Create the sign-in tenant for organisers (Entra External ID)
- **What:** in the **Microsoft Entra admin centre**, choose **Tenants → Create → External** (for customers). Name it `hostpointe-id` and pick a location. Then link it to the Hostpointe subscription for billing (it's free up to 50,000 monthly active users).
- **Why:** this handles organiser sign-in (email codes, Google and Microsoft accounts) without us building or storing passwords. Guests don't need to sign in at all.
- **You'll see:** a new tenant. Copy its **tenant name** and **tenant ID**.

## Step 10: Hand over to Segun
Give Segun, through Michael in Munder Difflin:
- The Subscription ID, the three resource group names, and the region (UK South)
- Confirmation that steps 3–9 are done, and the database choice from step 2 (a or b)
- The External ID tenant name and ID from step 9

Then tell Michael:
> "Azure is ready (see infra/AZURE_OWNER_SETUP.md). Segun can start HPE-11 and HPE-12. Stay inside the £10 budget and ask me before creating anything that costs money."

Segun will then:
1. Write the Bicep templates (infrastructure as code).
2. Deploy to `rg-hostpointe-dev` first, then staging.
3. Set up Key Vault, Application Insights and Container Apps.
4. Wire up GitHub Actions using OIDC.

He'll report anything with a cost before creating it.

---

**Never share:** your Azure password, database passwords, Stripe, Paystack or A1Pay keys, or anything labelled "secret". Real secrets go only into Azure Key Vault, and Segun will set up how.
