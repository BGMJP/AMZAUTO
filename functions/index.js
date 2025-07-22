const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin 초기화
admin.initializeApp();

/**
 * 테스트용 HTTP Function
 * URL: https://your-region-your-project.cloudfunctions.net/helloWorld
 */
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  
  functions.logger.info("Hello World 함수가 호출되었습니다!", {
    method: request.method,
    timestamp: new Date().toISOString()
  });
  
  response.json({
    message: "🚀 Firebase Functions가 정상 작동중입니다!",
    timestamp: new Date().toISOString(),
    status: "success",
    version: "1.0.0"
  });
});

/**
 * Asana Webhook 수신 Function
 * 작업 상태가 "분석 중"으로 변경될 때 트리거됨
 */
exports.asanaWebhook = functions.https.onRequest(async (request, response) => {
  try {
    // CORS 설정
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.set('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      response.status(200).send();
      return;
    }

    functions.logger.info("📬 Asana Webhook 호출됨", {
      method: request.method,
      body: request.body,
      headers: request.headers
    });

    // POST 요청만 처리
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Webhook 데이터 처리
    const webhookData = request.body;
    
    // 작업 상태 변경 감지 로직 (나중에 구현)
    if (webhookData.events) {
      for (const event of webhookData.events) {
        if (event.resource && event.resource.resource_type === 'task') {
          functions.logger.info("📋 작업 이벤트 감지됨", { 
            taskId: event.resource.gid,
            eventType: event.action 
          });
          
          // TODO: 작업 상태가 "분석 중"인지 확인 후 데이터 처리 트리거
        }
      }
    }

    response.json({ 
      message: "✅ Webhook 수신 완료",
      received: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    functions.logger.error("❌ Webhook 처리 중 오류:", error);
    response.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

/**
 * Firestore 연동 테스트 Function
 * 데이터베이스 읽기/쓰기 테스트용
 */
exports.testFirestore = functions.https.onRequest(async (request, response) => {
  try {
    response.set('Access-Control-Allow-Origin', '*');
    
    const db = admin.firestore();
    
    // 테스트 데이터 저장
    const testData = {
      message: "🔥 Firebase Functions와 Firestore 연동 테스트",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      environment: process.env.NODE_ENV || "development",
      requestInfo: {
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip
      }
    };
    
    const docRef = await db.collection('test').add(testData);
    
    // 저장된 데이터 조회
    const savedDoc = await docRef.get();
    
    functions.logger.info("💾 Firestore 테스트 데이터 저장됨", { 
      docId: docRef.id,
      data: savedDoc.data()
    });
    
    response.json({
      message: "✅ Firestore 연동 성공!",
      documentId: docRef.id,
      savedData: savedDoc.data(),
      status: "success"
    });

  } catch (error) {
    functions.logger.error("❌ Firestore 테스트 오류:", error);
    response.status(500).json({ 
      error: 'Firestore Error',
      message: error.message 
    });
  }
});

/**
 * 프로젝트 상태 확인 Function
 * 전체 시스템 헬스체크용
 */
exports.healthCheck = functions.https.onRequest(async (request, response) => {
  try {
    response.set('Access-Control-Allow-Origin', '*');
    
    const db = admin.firestore();
    const startTime = Date.now();
    
    // Firestore 연결 테스트
    await db.collection('health').doc('test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const responseTime = Date.now() - startTime;
    
    response.json({
      status: "healthy",
      message: "🎯 모든 시스템이 정상 작동중입니다",
      checks: {
        firebase: "✅ 정상",
        firestore: "✅ 정상",
        functions: "✅ 정상"
      },
      performance: {
        responseTime: `${responseTime}ms`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    functions.logger.error("❌ 헬스체크 실패:", error);
    response.status(500).json({
      status: "unhealthy",
      message: "시스템에 문제가 발생했습니다",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});