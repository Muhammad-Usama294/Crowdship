# Get Your Resend API Key

Follow these steps to get your Resend API key:

## Step 1: Sign Up for Resend

1. Go to [https://resend.com/](https://resend.com/)
2. Click **"Sign Up"** or **"Start for Free"**
3. Create an account (no credit card required for free tier)

## Step 2: Get Your API Key

1. After logging in, go to **API Keys** in the dashboard
2. Click **"Create API Key"**
3. Give it a name like "CrowdShip KYC Notifications"
4. Click **"Create"**
5. **Copy the API key** - it looks like: `re_123abc...`

## Step 3: Add to Your .env.local File

1. Open `h:\AGAPP\.env.local`
2. Add this line at the end:
   ```
   RESEND_API_KEY=re_your_actual_key_here
   ```
3. Replace `re_your_actual_key_here` with the key you copied
4. Save the file

## Step 4: Restart Your Dev Server

1. Stop your dev server (Ctrl+C in terminal)
2. Run `npm run dev` again
3. The email notifications will now work!

## Step 5: Test the Email Notifications

1. Go to `/admin` in your browser
2. Approve or reject a KYC document
3. Check if the email was sent - look at your terminal for:
   - `✅ KYC approval email sent to: ...` OR
   - `✅ KYC rejection email sent to: ...`

## Important Notes

- **Free tier**: 3,000 emails/month, 100 emails/day
- **Default sender**: `onboarding@resend.dev` (works for testing)
- **For production**: You'll need to verify your own domain
- **Emails are non-blocking**: If email fails, KYC approval/rejection still works

## Troubleshooting

If emails aren't sending:
1. Check that the API key is correctly added to `.env.local`
2. Make sure you restarted the server after adding the key
3. Check terminal logs for error messages
4. Verify the API key is valid in Resend dashboard

---

**Once you've added the API key and restarted the server, the email notifications will work automatically!**
