(function () {
  const STORAGE_KEY = "churchAdminAnnouncementText";

  function getSavedText() {
    return window.sessionStorage.getItem(STORAGE_KEY) || "";
  }

  function saveText(text) {
    window.sessionStorage.setItem(STORAGE_KEY, text);
  }

  function titleToDateLabel(title) {
    const match = title.match(/\(([^)]+)\)/);

    if (!match) {
      return "";
    }

    const [start, end] = match[1].split(/\s*-\s*/);
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const parseDate = (value) => {
      const parts = value.split(/[/:]/).map(Number);

      if (parts.length !== 3) {
        return null;
      }

      return new Date(parts[2], parts[0] - 1, parts[1]);
    };

    const startDate = parseDate(start);
    const endDate = parseDate(end);

    if (!startDate || !endDate) {
      return match[1];
    }

    return `${formatter.format(startDate)} through ${formatter.format(endDate)}`;
  }

  function isDate(value) {
    return /^\d{1,2}[/:]\d{1,2}[/:]\d{4}$/.test(value);
  }

  function isDay(value) {
    return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(value);
  }

  function isDayCell(value) {
    return isDay(value) || isDayDetail(value);
  }

  function cleanLine(line) {
    return line
      .replace(/\u200b/g, "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, label, url) => {
        const cleanLabel = label.replace(/\*\*/g, "").trim();
        return cleanLabel === url ? url : `${cleanLabel}: ${url}`;
      })
      .replace(/^\*\*/, "")
      .replace(/\*\*$/, "")
      .replace(/\*\*/g, "")
      .trim();
  }

  function nextNonEmptyIndex(lines, startIndex) {
    for (let index = startIndex; index < lines.length; index += 1) {
      if (lines[index]) {
        return index;
      }
    }

    return -1;
  }

  function parseScheduleRows(rawLines, headerIndex) {
    const rows = [];

    if (headerIndex < 0) {
      return rows;
    }

    const headerLine = rawLines[headerIndex];
    let index = /^date$/i.test(headerLine) ? headerIndex + 1 : headerIndex + 1;

    while (index < rawLines.length && !isDate(rawLines[index])) {
      index += 1;
    }

    while (index < rawLines.length) {
      const line = rawLines[index];

      if (!line) {
        index += 1;
        continue;
      }

      const tabParts = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);

      if (tabParts.length >= 3 && isDate(tabParts[0])) {
        rows.push(normalizeScheduleRow(tabParts[0], tabParts[1], tabParts.slice(2)));
        index += 1;
        continue;
      }

      const sameLineMatch = line.match(/^(\d{1,2}[/:]\d{1,2}[/:]\d{4})\s+([A-Za-z]+)\s+(.+)$/);

      if (sameLineMatch) {
        rows.push(normalizeScheduleRow(sameLineMatch[1], sameLineMatch[2], [sameLineMatch[3]]));
        index += 1;
        continue;
      }

      const date = rawLines[index];
      const dayIndex = nextNonEmptyIndex(rawLines, index + 1);
      const day = dayIndex >= 0 ? rawLines[dayIndex] : "";

      if (!isDate(date) || !isDayCell(day)) {
        break;
      }

      const activityLines = [];
      index = dayIndex + 1;

      while (index < rawLines.length) {
        if (isDate(rawLines[index])) {
          break;
        }

        if (!rawLines[index]) {
          const nextIndex = nextNonEmptyIndex(rawLines, index + 1);
          const nextLine = nextIndex >= 0 ? rawLines[nextIndex] : "";

          if (nextIndex < 0) {
            index = rawLines.length;
            break;
          }

          if (isDate(nextLine)) {
            index = nextIndex;
            break;
          }

          if (shouldContinueActivityAfterBlank(nextLine, activityLines.length > 0)) {
            index = nextIndex;
            continue;
          }

          index = nextIndex;
          break;
        }

        activityLines.push(rawLines[index]);
        index += 1;
      }

      const row = normalizeScheduleRow(date, day, activityLines);

      rows.push(row);
    }

    return rows;
  }

  function normalizeScheduleRow(date, day, activityLines) {
    const dayLines = [day];
    const serviceLines = [...activityLines];
    const weekday = getWeekdayFromDate(date);

    if (weekday && !isDay(day)) {
      dayLines.unshift(weekday);
    }

    while (serviceLines.length && shouldMoveToDayCell(serviceLines[0], serviceLines[1])) {
      dayLines.push(serviceLines.shift());
    }

    return {
      date,
      day: dayLines.join("\n"),
      activity: serviceLines.join("\n")
    };
  }

  function isDayDetail(value) {
    return /^(feast\b|first friday$|life sunday$|cml day$|transfiguration\b)/i.test(value);
  }

  function getWeekdayFromDate(value) {
    const parts = value.split(/[/:]/).map(Number);

    if (parts.length !== 3) {
      return "";
    }

    const date = new Date(parts[2], parts[0] - 1, parts[1]);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  }

  function isServiceLine(value) {
    return /^(\d{1,2}:\d{2}\s*(AM|PM)\b|N\/A$)/i.test(value);
  }

  function isAnnouncementHeading(value) {
    return /^[A-Z0-9][^:]{2,90}:\s+/.test(value);
  }

  function shouldContinueActivityAfterBlank(value, hasActivityLines) {
    if (isServiceLine(value) || /^followed by\b/i.test(value)) {
      return true;
    }

    return hasActivityLines && !isAnnouncementHeading(value);
  }

  function shouldMoveToDayCell(value, nextValue) {
    if (!value || isServiceLine(value)) {
      return false;
    }

    return isDayDetail(value) || Boolean(nextValue && isServiceLine(nextValue));
  }

  function getAnnouncementStartIndex(rawLines, headerIndex, scheduleRows) {
    if (!scheduleRows.length) {
      return -1;
    }

    const lastRow = scheduleRows[scheduleRows.length - 1];
    const lastActivityLine = lastRow.activity.split("\n").filter(Boolean).at(-1);
    let lastRowIndex = -1;

    rawLines.forEach((line, index) => {
      if (line.includes(lastRow.date) || line === lastActivityLine) {
        lastRowIndex = Math.max(lastRowIndex, index);
      }
    });

    for (let index = Math.max(headerIndex + 1, lastRowIndex + 1); index < rawLines.length; index += 1) {
      if (rawLines[index]) {
        return index;
      }
    }

    return -1;
  }

  function parseAnnouncementText(text) {
    const rawLines = text.split(/\r?\n/).map(cleanLine);
    const meaningfulLines = rawLines.filter(Boolean);
    const title = meaningfulLines[0] || "Weekly Schedule";
    const dateLabel = titleToDateLabel(title);
    const dateHeaderIndex = rawLines.findIndex((line) => /^date$/i.test(line) || /^date\s+day\s+/i.test(line) || /^date\t+day\t+/i.test(line));
    const scheduleRows = parseScheduleRows(rawLines, dateHeaderIndex);
    let captionLines = rawLines.slice(1, Math.max(1, dateHeaderIndex)).filter(Boolean);
    let announcementLines = [];
    const announcementStartIndex = getAnnouncementStartIndex(rawLines, dateHeaderIndex, scheduleRows);

    if (announcementStartIndex >= 0) {
      announcementLines = rawLines.slice(announcementStartIndex).filter(Boolean);
    }

    if (!captionLines.length) {
      captionLines = [
        "Praise be to Jesus Christ, Now, Always, and Forever!",
        "Please find below this week's Holy Qurbana schedule and parish activities."
      ];
    }

    return {
      title,
      dateLabel,
      caption: `${captionLines.join("\n")}\n\n${title}`,
      announcements: announcementLines.join("\n"),
      scheduleRows
    };
  }

  window.churchAdminAnnouncementData = {
    getSavedText,
    saveText,
    parseAnnouncementText
  };
})();
