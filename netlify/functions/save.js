// 저장: 로그인한 유저의 세이브 데이터(JSON 문자열)를 Netlify Blobs에 저장한다.
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: '로그인이 필요합니다.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청 본문입니다.' }) };
  }

  const { slotId, data } = body;
  if (!slotId || typeof data !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'slotId와 data(문자열)가 필요합니다.' }) };
  }

  // 세이브 데이터 크기 제한 (Netlify Blobs는 큰 값도 지원하지만, 과도한 남용을 막기 위한 안전장치)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (data.length > MAX_SIZE) {
    return { statusCode: 413, body: JSON.stringify({ error: '저장 데이터가 너무 큽니다 (5MB 제한).' }) };
  }

  // 일부 배포 환경에서는 Netlify Blobs의 자동 컨텍스트 주입(NETLIFY_BLOBS_CONTEXT)이
  // 안 되는 경우가 있어(MissingBlobsEnvironmentError), siteID/token 환경변수가 설정돼
  // 있으면 수동으로 넘겨준다. Site configuration > Environment variables에
  // BLOBS_SITE_ID(사이트 ID)와 BLOBS_TOKEN(Personal Access Token)을 등록해두면 된다.
  const storeOpts = { name: 'eldria-saves', consistency: 'strong' };
  if (process.env.BLOBS_SITE_ID && process