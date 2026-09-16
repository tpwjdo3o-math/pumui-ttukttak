/**
 * 품의뚝딱
 * Vercel Function + Gemini API
 *
 * 1순위: Gemini 3.5 Flash
 * 2순위: Gemini 3.5 Flash-Lite
 */

const MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];


/* =========================================================
   Vercel API
========================================================= */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST 요청만 사용할 수 있습니다.",
    });
  }


  try {

    /* =====================================================
       Gemini API KEY
    ===================================================== */

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY가 Vercel에 설정되어 있지 않습니다.",
      });
    }


    /* =====================================================
       입력값
    ===================================================== */

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const title = String(body.title || "").trim();
    const relatedDoc = String(body.relatedDoc || "").trim();
    const extraInfo = String(body.extraInfo || "").trim();

    const images =
      Array.isArray(body.images)
        ? body.images
        : [];


    if (!title) {
      return res.status(400).json({
        success: false,
        error: "품의 제목을 입력해 주세요.",
      });
    }


    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "장바구니 이미지가 없습니다.",
      });
    }


    /* =====================================================
       프롬프트
    ===================================================== */

    const prompt = `
당신은 대한민국 학교의 구매 품의 업무를 돕는 AI입니다.

첨부된 장바구니 캡처 이미지를 매우 꼼꼼하게 분석하고,
사용자가 입력한 제목을 학교 품의 기안에 적합한 제목으로 다듬으세요.

사용자가 최종 결과를 직접 검토할 예정입니다.
불확실한 내용은 절대로 임의로 추측하지 마세요.


[사용자 입력]

사용자가 입력한 품의 제목:
${title}

관련 문서:
${relatedDoc || "없음"}

추가 설명:
${extraInfo || "없음"}


==================================================
1. 품의 제목 작성
==================================================

polished_title에는
사용자가 입력한 제목의 의미를 유지하면서
학교 품의 기안에 적합한 간결한 제목을 작성하세요.

규칙:

1) 말투형 표현은 공문서식 명사형으로 정리합니다.

예:
"수학 교과에서 쓸 물품 구입"
→
"수학 교과 운영 물품 구입"


2) 물품 구매 목적이면 문맥에 맞게 다음과 같이 정리합니다.

"○○ 운영 물품 구입"
"○○ 활동 물품 구입"
"○○ 수업 운영 물품 구입"


3) 교통비·참가비·식비 등 비용 지출이면
문맥에 따라 "지출"을 사용합니다.

예:
"학생수학공감동아리 교통비"
→
"학생수학공감동아리 교통비 지출"


4) 사용자가 제공하지 않은
연도, 학기, 사업명, 행사명은 임의로 추가하지 마세요.

5) 사용자가 입력한 연도·학기는 유지하세요.

6) 제목은 간결하게 작성하세요.

7) 제목 끝에 마침표를 붙이지 마세요.


==================================================
2. 상품 추출
==================================================

실제 구매 대상 상품만 추출하세요.

각 상품에서 다음 정보를 확인하세요.

- 품명
- 규격 또는 옵션
- 수량
- 단위
- 단가
- 금액


쇼핑몰 상품명이 지나치게 길면
상품의 의미를 유지하면서
학교 품의에 적합하게 간결히 정리하세요.


예:

"닳지않는 무한 연필 반영구 샤프..."
→
"무한 연필 반영구 샤프"


색상, 사이즈, 모델, 용량,
구성수량, 세트구성 등은
가능하면 품명과 분리하여 규격에 작성하세요.


==================================================
3. 수량 · 단가 · 금액
==================================================

화면에 표시된 가격이

- 1개당 단가인지
- 선택한 수량 전체 금액인지

반드시 구별하세요.


예:

수량 15개
표시금액 5,700원

5,700원이 15개 전체 금액이면

수량: 15
단가: 380
금액: 5700

입니다.


가능한 모든 품목에서

단가 × 수량 = 금액

을 검산하세요.


관계가 맞지 않거나
이미지만으로 판단할 수 없다면
숫자를 임의로 만들지 마세요.

confidence를 "low"로 지정하고
warnings에 이유를 기록하세요.


==================================================
4. 배송비
==================================================

배송비를 반드시 확인하세요.

다음 표현을 확인합니다.

- 배송비
- 배송료
- 묶음배송
- 무료배송


유료 배송비는 반드시 별도의 품목 행으로 생성하세요.


예:

상품:
샤프심

배송비:
3,000원


결과:

product_name:
샤프심 배송비

specification:
배송비

quantity:
1

unit:
건

unit_price:
3000

amount:
3000

item_type:
shipping


배송비가 어느 상품에 해당하는지 판단할 때는

- 배송비 표시 위치
- 상품 카드 경계
- 판매자 영역
- 묶음배송 영역
- 상품 옵션 영역

을 함께 고려하세요.


같은 상품의 옵션이 여러 개 있더라도
배송비가 한 번만 표시됐다면
배송비 행도 한 번만 생성하세요.


서로 다른 상품 또는 판매자마다
배송비가 각각 있으면
각각 별도 배송비 행을 생성하세요.


무료배송은 품목으로 생성하지 마세요.


배송비 귀속이 불확실하면
임의로 연결하지 말고
warnings에 기록하세요.


==================================================
5. 제외할 항목
==================================================

다음 항목은 품목으로 생성하지 마세요.

- 쿠폰
- 할인금액
- 적립금
- 포인트
- 주문할인
- 쇼핑몰 전체 합계


==================================================
6. 옵션 및 중복
==================================================

같은 상품이라도
색상·사이즈·규격 등에 따라
수량 또는 가격이 별도로 표시되면
옵션별로 별도 행을 작성하세요.


여러 장의 캡처가 서로 겹치는 경우
같은 상품이 중복 촬영된 것이 명확하면
두 번 생성하지 마세요.


==================================================
7. 불확실한 정보
==================================================

이미지가 잘렸거나
글자·숫자가 명확하지 않으면
절대로 추측하지 마세요.


confidence 기준:

high
= 이미지에서 명확하게 확인

medium
= 대체로 확인되나 일부 해석 필요

low
= 정보가 부족하거나 불확실


medium 또는 low인 경우
note에 이유를 작성하세요.


==================================================
8. 품의 개요 첫 문장
==================================================

purpose_sentence에는
polished_title과 추가 설명을 참고하여
학교 공문서에 적합한 자연스러운
품의 개요 첫 문장을 작성하세요.


예:

polished_title:
2026. 수학 교과 운영 물품 구입

purpose_sentence:
2026. 수학 교과 운영에 필요한 물품을 아래와 같이 구입하고자 합니다.


다른 예:

polished_title:
학생수학공감동아리 교통비 지출

purpose_sentence:
학생수학공감동아리 교통비를 아래와 같이 지출하고자 합니다.


purpose_sentence 앞에는
1., 2., 가., 나. 등의 번호를 붙이지 마세요.

관련 문서는 purpose_sentence 안에 넣지 마세요.

반드시 지정된 JSON 형식으로 반환하세요.
`;


    /* =====================================================
       Gemini 입력
    ===================================================== */

    const parts = [
      {
        text: prompt,
      },
    ];


    for (const dataUrl of images) {

      const parsed = parseDataUrl(dataUrl);

      parts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.base64,
        },
      });

    }


    /* =====================================================
       Structured Output Schema
    ===================================================== */

    const responseSchema = {

      type: "object",

      properties: {

        polished_title: {
          type: "string",
        },

        purpose_sentence: {
          type: "string",
        },

        items: {

          type: "array",

          items: {

            type: "object",

            properties: {

              product_name: {
                type: "string",
              },

              specification: {
                type: "string",
              },

              quantity: {
                type: "number",
              },

              unit: {
                type: "string",
              },

              unit_price: {
                type: "number",
              },

              amount: {
                type: "number",
              },

              item_type: {
                type: "string",
                enum: [
                  "product",
                  "shipping",
                ],
              },

              confidence: {
                type: "string",
                enum: [
                  "high",
                  "medium",
                  "low",
                ],
              },

              note: {
                type: "string",
              },

            },

            required: [
              "product_name",
              "specification",
              "quantity",
              "unit",
              "unit_price",
              "amount",
              "item_type",
              "confidence",
              "note",
            ],

          },

        },

        warnings: {

          type: "array",

          items: {
            type: "string",
          },

        },

      },

      required: [
        "polished_title",
        "purpose_sentence",
        "items",
        "warnings",
      ],

    };


    /* =====================================================
       Gemini API Payload
    ===================================================== */

    const payload = {

      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],

      generationConfig: {

        responseMimeType:
          "application/json",

        responseSchema:
          responseSchema,

      },

    };


    /* =====================================================
       Gemini 호출
    ===================================================== */

    const result =
      await callGeminiWithFallback(
        apiKey,
        payload
      );


    const gemini =
      result.data;


    /* =====================================================
       응답 확인
    ===================================================== */

    if (
      !gemini.candidates ||
      gemini.candidates.length === 0
    ) {

      throw new Error(
        "Gemini 분석 결과가 없습니다."
      );

    }


    const outputText =
      gemini.candidates[0]
        ?.content
        ?.parts
        ?.map(
          part => part.text || ""
        )
        .join("")
        .trim();


    if (!outputText) {

      throw new Error(
        "Gemini 분석 결과가 비어 있습니다."
      );

    }


    /* =====================================================
       JSON 변환
    ===================================================== */

    let analyzed;


    try {

      analyzed =
        JSON.parse(
          outputText
        );

    } catch (error) {

      console.error(
        "Gemini 원본 결과:",
        outputText
      );

      throw new Error(
        "Gemini 분석 결과를 JSON으로 변환하지 못했습니다."
      );

    }


    analyzed.items =
      Array.isArray(
        analyzed.items
      )
        ? analyzed.items
        : [];


    analyzed.warnings =
      Array.isArray(
        analyzed.warnings
      )
        ? analyzed.warnings
        : [];


    /* =====================================================
       Flash-Lite 사용 시 안내
    ===================================================== */

    if (
      result.model ===
      "gemini-3.5-flash-lite"
    ) {

      analyzed.warnings.unshift(
        "Gemini 서버 혼잡으로 보조 모델(3.5 Flash-Lite)을 사용했습니다. 품목과 금액을 한 번 더 확인해 주세요."
      );

    }


    /* =====================================================
       수량 × 단가 검산
    ===================================================== */

    analyzed.items.forEach(
      (item, index) => {

        const quantity =
          Number(
            item.quantity
          );

        const unitPrice =
          Number(
            item.unit_price
          );

        const amount =
          Number(
            item.amount
          );


        if (
          Number.isFinite(quantity) &&
          Number.isFinite(unitPrice) &&
          Number.isFinite(amount)
        ) {

          const calculated =
            quantity *
            unitPrice;


          if (
            Math.abs(
              calculated -
              amount
            ) >= 1
          ) {

            item.confidence =
              "low";


            const warning =
              `${index + 1}번째 품목(${item.product_name})의 단가 × 수량과 금액이 일치하지 않습니다.`;


            if (
              !analyzed.warnings.includes(
                warning
              )
            ) {

              analyzed.warnings.push(
                warning
              );

            }

          }

        }

      }
    );


    /* =====================================================
       성공
    ===================================================== */

    return res.status(200).json({

      success: true,

      data: analyzed,

      model: result.model,

    });


  } catch (error) {

    console.error(error);


    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        String(error),

    });

  }

}


/* =========================================================
   Gemini 호출
   - 서버 혼잡 시 재시도
   - 실패하면 Flash-Lite로 자동 변경
========================================================= */

async function callGeminiWithFallback(
  apiKey,
  payload
) {

  let lastError =
    "Gemini API 요청에 실패했습니다.";


  for (
    const model of MODELS
  ) {

    for (
      let attempt = 0;
      attempt < 3;
      attempt++
    ) {

      if (attempt > 0) {

        const wait =
          1500 *
          Math.pow(
            2,
            attempt - 1
          );

        await sleep(wait);

      }


      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;


      let response;


      try {

        response =
          await fetch(
            url,
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json",

                "x-goog-api-key":
                  apiKey,

              },

              body:
                JSON.stringify(
                  payload
                ),

            }
          );

      } catch (error) {

        lastError =
          `Gemini 서버 연결 오류: ${error.message}`;

        continue;

      }


      let responseData;


      try {

        responseData =
          await response.json();

      } catch (error) {

        lastError =
          "Gemini 서버의 응답을 읽지 못했습니다.";

        continue;

      }


      /* 성공 */

      if (response.ok) {

        return {

          model:
            model,

          data:
            responseData,

        };

      }


      const apiMessage =
        responseData
          ?.error
          ?.message ||
        `HTTP ${response.status}`;


      lastError =
        apiMessage;


      console.log(
        `Gemini 오류 / ${model} / HTTP ${response.status} / ${apiMessage}`
      );


      /*
       * 429 = 사용량 제한
       * 500 / 502 / 503 / 504 = 일시적 서버 오류
       *
       * 재시도 후 다음 모델로 넘어감
       */

      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {

        continue;

      }


      /*
       * 특정 모델을 계정에서 사용할 수 없는 경우에도
       * 다음 모델을 시도
       */

      if (
        response.status === 400 ||
        response.status === 404
      ) {

        break;

      }


      throw new Error(
        `Gemini API 오류: ${apiMessage}`
      );

    }

  }


  throw new Error(
    "Gemini 모델 호출에 모두 실패했습니다. 잠시 후 다시 시도해 주세요. (" +
    lastError +
    ")"
  );

}


/* =========================================================
   이미지 Data URL
========================================================= */

function parseDataUrl(
  dataUrl
) {

  const text =
    String(
      dataUrl || ""
    );


  const match =
    text.match(
      /^data:(image\/[^;]+);base64,(.+)$/
    );


  if (!match) {

    throw new Error(
      "이미지 데이터 형식이 올바르지 않습니다."
    );

  }


  return {

    mimeType:
      match[1],

    base64:
      match[2],

  };

}


/* =========================================================
   대기
========================================================= */

function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}
