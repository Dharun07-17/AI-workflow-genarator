const nodemailer  = require("nodemailer");
require("dotenv").config();

async function runEmail(data) {
  try {
    const input   = typeof data === "string" ? data : data.body || "";
    const context = data.context || null;

    // ── Extract recipient ──────────────────────────────────────────
    // Priority:
    // 1. Email address found anywhere in the prompt
    // 2. Falls back to EMAIL_TO in .env
    // 3. Falls back to sender's own address

    const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
    const foundEmails = input.match(emailRegex) || [];

    // Filter out the sender's own address from matches
    const externalEmails = foundEmails.filter(e => e !== process.env.EMAIL_USER);

    const recipient =
      externalEmails[0]          ||   // Found in prompt
      process.env.EMAIL_TO       ||   // .env default
      process.env.EMAIL_USER;         // Fall back to self

    console.log("[Email] Emails found in prompt:", foundEmails);
    console.log("[Email] Sending to:", recipient);

    // ── Extract subject ────────────────────────────────────────────
    const subjectMatch = input.match(/subject:?\s*["']?(.+?)["']?(?:\n|,|and send|$)/i);
    let subject = subjectMatch?.[1]?.trim();

    // Auto-generate subject from context if not specified
    if (!subject) {
      if (context && Array.isArray(context) && context[0]?.title) {
        subject = `AI Summary: ${context[0].title.slice(0, 50)}...`;
      } else if (typeof context === "string") {
        subject = `AI Summary: ${context.slice(0, 50)}...`;
      } else {
        subject = "AI Workflow Report";
      }
    }

    // ── Build email body ───────────────────────────────────────────
    let body = "";

    if (context) {
      if (typeof context === "string") {
        body = context;

      } else if (Array.isArray(context)) {
        body = context.map((item, i) => {
          if (item.title) return `${i + 1}. ${item.title}\n   ${item.url || ""}`;
          if (item.text)  return `${i + 1}. ${item.text} — ${item.author || ""}`;
          return `${i + 1}. ${JSON.stringify(item)}`;
        }).join("\n\n");

      } else if (typeof context === "object") {
        body = JSON.stringify(context, null, 2);
      }
    }

    if (!body) body = input;

    body += "\n\n---\nSent by AI Workflow Generator\n" + new Date().toLocaleString();

    // ── Check credentials ──────────────────────────────────────────
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("[Email] Missing credentials in .env");
      return {
        action:  "email_mock",
        to:      recipient,
        subject,
        status:  "MOCK — Add EMAIL_USER and EMAIL_PASS to .env",
        preview: body.slice(0, 300)
      };
    }

    // ── Send via Gmail ─────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s/g, "") // Remove spaces from app password
      }
    });

    await transporter.verify();
    console.log("[Email] Gmail connection verified");

    const info = await transporter.sendMail({
      from:    `"AI Workflow Agent" <${process.env.EMAIL_USER}>`,
      to:      recipient,
      subject: subject,
      text:    body,
      html:    `<pre style="font-family:sans-serif;font-size:14px;line-height:1.6">${body.replace(/\n/g, "<br>")}</pre>`
    });

    console.log("[Email] Sent! Message ID:", info.messageId);

    return {
      action:    "email_sent",
      to:        recipient,
      subject,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
      status:    "Sent successfully via Gmail",
      preview:   body.slice(0, 300)
    };

  } catch (err) {
    console.error("[Email] Error:", err.message);

    let hint = "";
    if (err.message.includes("Invalid login") || err.message.includes("Username and Password")) {
      hint = "Use your App Password, not your regular Gmail password. Generate one at https://myaccount.google.com/apppasswords";
    } else if (err.message.includes("ECONNREFUSED")) {
      hint = "Cannot connect to Gmail. Check your internet connection.";
    }

    return {
      action: "email_failed",
      error:  err.message,
      hint,
      status: "Failed to send email"
    };
  }
}

module.exports = { runEmail };
