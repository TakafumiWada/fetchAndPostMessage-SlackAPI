const slackAppTokenFromFetch = "(取得先のトークン)";
const slackAppTokenFromPost = "(送信先のトークン)";
const channelIdFromFetch = "(取得先のChannelId)";
const channelIdFromPost = "(送信先のChannelId))";

const fetchMessage = () => {
  const url = "https://slack.com/api/conversations.history";
  const options = {
    method: "get",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      token: slackAppTokenFromFetch,
      channel: channelIdFromFetch,
    },
  };
  return UrlFetchApp.fetch(url, options);
};
const sendMessage = (text) => {
  const url = "https://slack.com/api/chat.postMessage";
  const options = {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      token: slackAppTokenFromPost,
      channel: channelIdFromPost,
      text: text,
      as_user: true,
    },
  };
  return UrlFetchApp.fetch(url, options);
};
const sendMessageThread = (text, ts) => {
  const url = "https://slack.com/api/chat.postMessage";
  const options = {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      token: slackAppTokenFromPost,
      channel: channelIdFromPost,
      text: text,
      as_user: true,
      reply_broadcast: false,
      thread_ts: ts,
    },
  };
  return UrlFetchApp.fetch(url, options);
};

const fetchMessageLink = (ts) => {
  const url = "https://slack.com/api/chat.getPermalink";
  const options = {
    method: "get",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      token: slackAppTokenFromFetch,
      channel: channelIdFromFetch,
      message_ts: ts,
    },
  };
  return UrlFetchApp.fetch(url, options);
};

const isToday = (someDate) => {
  const today = new Date();
  return (
    someDate.getDate() == today.getDate() &&
    someDate.getMonth() == today.getMonth() &&
    someDate.getFullYear() == today.getFullYear()
  );
};

const getTodayBaseList = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  const date = new Date();

  const todayBaseList = [];
  let i = 2;
  while (true) {
    const base = sheet.getRange(i, date.getDay() + 1).getValue();
    if (!base) return todayBaseList;
    todayBaseList.push(base);
    i++;
  }
};

function getSlackUser() {
  try {
    const response = fetchMessage();
    const msgList = JSON.parse(response).messages;

    // ユーザーが投稿したメッセージのみに絞る
    const userMsgList = msgList.filter((msg) => !msg.subtype);

    // userMsgList のうち、返信がないメッセージのみに絞る
    const noReplyMsgList = userMsgList.filter((msg) => !msg.reply_count);

    // noReplyMsgList のうち、今日のメッセージのみに絞る
    const todayMsgList = noReplyMsgList.filter((msg) => {
      const date = new Date(msg.ts * 1000);
      date.setHours(date.getHours() + 14); // 日本時間に変換
      return isToday(date);
    });

    // todayMsgList のリンクを取得する
    const todayMsgListLinks = todayMsgList.map((msg) => {
      const response = fetchMessageLink(msg.ts);
      const data = JSON.parse(response);
      return data.permalink;
    });

    if (todayMsgList.length) {
      console.log(todayMsgList);
      const todayBaseList = getTodayBaseList();
      const response = sendMessage(
        `*【bot投稿です】*\n本日の question_unity で未回答の質問があります。\n\n${todayMsgListLinks.join(
          "\n"
        )}\n\n本日の担当拠点は... `
      );
      const postedMessge = JSON.parse(response);
      console.log(todayBaseList);
      todayBaseList.forEach((base) => {
        sendMessageThread(base, postedMessge.ts);
      });
    } else {
      sendMessage(
        `*【bot投稿です】*\n\n本日の question_unity で未回答の質問はありません！`
      );
    }
  } catch (e) {
    sendMessage("エラー発生！@wad までご連絡を🙏");
  }
}
