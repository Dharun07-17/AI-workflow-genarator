async function runCalendar(input) {
  try {
    console.log("[Calendar] Processing:", input);

    const lower = input.toLowerCase();
    
    // Parse date
    let targetDate = new Date();
    if (lower.includes("tomorrow")) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes("next week")) {
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (lower.includes("monday")) {
      const today = targetDate.getDay();
      const daysUntilMonday = (1 - today + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilMonday);
    }

    // Extract meeting title - improved logic
    let title = "AI Agent Scheduled Meeting";
    
    const patterns = [
      /meeting (?:about |for |regarding |on |to discuss )?(.+?)(?:\s+tomorrow|\s+next week|\s+on monday|$)/i,
      /schedule (?:a )?(?:meeting )?(?:about |for |regarding )?(.+?)(?:\s+tomorrow|\s+next week|$)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        title = match[1].trim();
        break;
      }
    }

    return {
      action: "meeting_scheduled",
      title,
      date: targetDate.toISOString().split('T')[0],
      time: "10:00 AM",
      status: "MOCK - Integration with Google Calendar API needed",
      calendarURL: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${targetDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
    };

  } catch (err) {
    console.error("[Calendar] Error:", err.message);
    return { error: err.message };
  }
}

module.exports = { runCalendar };
