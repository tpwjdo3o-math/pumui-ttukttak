export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST 요청만 사용할 수 있습니다."
    });
  }

  try {

    const {
      title,
      relatedDoc,
      extraInfo,
      images
    } = req.body;


    if (!title) {
      return res.status(400).json({
        error: "품의 제목이 없습니다."
      });
    }


    if (!images || images.length === 0) {
      return res.status(400).json({
        error: "분석할 장바구니 이미지가 없습니다."
      });
    }


    const imageContents = images.map(image => ({
      type: "input_image",
      image_url: image,
      detail: "high"
    }));


    const prompt = `
당신은 대한민국 학교의 구매 품의 업무를 돕는 AI입니다.

사용자가 제공한 장바구니 캡처 이미지를 매우 꼼꼼하게 분석하세요.

[사용자 입력]

품의 제목:
${title}

관련 문서:
${relatedDoc || "없음"}

추가 설명:
${extraInfo || "없음"}


[장바구니 분석 규칙]

1. 실제 구매 대상 상품만 추출하세요.

2. 각 품목에 대해 다음 정보를 추출하세요.

- 품명
- 규격 또는 옵션
- 수량
- 단위
- 단가
- 금액

3. 상품명이 쇼핑몰식으로 너무 길면
핵심 의미는 유지하면서 학교 품의에 적합하게 간결하게 정리하세요.

4. 색상, 크기, 구성, 세트 수량 등은
가능하면 품명과 분리하여 규격에 기록하세요.

5. 표시된 가격이 단가인지,
해당 옵션 전체 금액인지 반드시 구별하세요.

예를 들어:

수량이 15이고
화면에 금액이 5,700원이며
해당 옵션 전체 가격이 5,700원인 경우

단가는 380원입니다.

즉,

380 × 15 = 5,700

이 되어야 합니다.

6. 반드시 다음 계산관계를 검증하세요.

단가 × 수량 = 금액

맞지 않으면 임의로 숫자를 만들어내지 말고
확인이 필요한 항목으로 표시하세요.

7. 배송비를 반드시 확인하세요.

무료배송이 아닌 배송비가 있다면
상품과 별도의 품목 행으로 생성합니다.

예:

상품: 무한 연필
배송비: 3,000원

결과:

품명: 무한 연필 배송비
규격: 배송비
수량: 1
단위: 건
단가: 3000
금액: 3000
종류: shipping

8. 배송비가 어느 상품에 해당하는지 판단할 때는

- 상품 카드의 경계
- 배송비 표시 위치
- 판매자별 상품 묶음
- 옵션 구조
- 화면 배치

를 함께 고려하세요.

9. 여러 옵션에 배송비가 한 번만 부과되었다면
배송비를 여러 번 만들지 마세요.

10. 서로 다른 상품 또는 판매자에
각각 배송비가 표시되어 있다면
각 배송비를 별도의 행으로 만드세요.

11. 무료배송은 품목으로 만들지 마세요.

12. 배송비가 어느 상품에 속하는지 불확실하면
추측하지 말고 warnings에 표시하세요.

13. 쿠폰, 할인금액, 적립금 등은
품목으로 생성하지 마세요.

14. 동일 상품이라도 색상·크기 등 옵션이 다르고
각각 수량이 따로 표시되면 별도 행으로 작성하세요.

15. 여러 캡처 이미지가 서로 겹쳐
같은 상품이 중복 촬영된 것이 명확하면
중복으로 추출하지 마세요.

16. 이미지가 잘렸거나 숫자가 선명하지 않다면
추측하지 말고 confidence를 "low"로 표시하세요.

17. purpose_sentence에는
품의 제목과 추가 설명을 이용하여
품의 개요의 첫 문장으로 사용할
자연스러운 공문체 한 문장만 작성하세요.

예:

"2026. 2학기 수학과 수업 운영에 필요한 물품을 아래와 같이 구입하고자 합니다."

purpose_sentence에는
문장 앞 번호를 붙이지 마세요.

관련 문서도 purpose_sentence에 넣지 마세요.
`;


    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({

          model: "gpt-5.6-terra",

          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                },
                ...imageContents
              ]
            }
          ],

          text: {
            format: {

              type: "json_schema",

              name: "purchase_analysis",

              strict: true,

              schema: {

                type: "object",

                properties: {

                  purpose_sentence: {
                    type: "string"
                  },

                  items: {
                    type: "array",

                    items: {
                      type: "object",

                      properties: {

                        product_name: {
                          type: "string"
                        },

                        specification: {
                          type: "string"
                        },

                        quantity: {
                          type: "number"
                        },

                        unit: {
                          type: "string"
                        },

                        unit_price: {
                          type: "number"
                        },

                        amount: {
                          type: "number"
                        },

                        item_type: {
                          type: "string",
                          enum: [
                            "product",
                            "shipping"
                          ]
                        },

                        confidence: {
                          type: "string",
                          enum: [
                            "high",
                            "medium",
                            "low"
                          ]
                        },

                        note: {
                          type: "string"
                        }

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
                        "note"
                      ],

                      additionalProperties: false
                    }
                  },

                  warnings: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  }

                },

                required: [
                  "purpose_sentence",
                  "items",
                  "warnings"
                ],

                additionalProperties: false
              }
            }
          }

        })
      }
    );


    const data = await response.json();


    if (!response.ok) {

      console.error(data);

      return res.status(500).json({
        error:
          data?.error?.message ||
          "AI 분석 요청에 실패했습니다."
      });

    }


    let outputText = "";


    for (const output of data.output || []) {

      if (output.type !== "message") {
        continue;
      }

      for (const part of output.content || []) {

        if (part.type === "output_text") {
          outputText += part.text;
        }

      }

    }


    if (!outputText) {

      return res.status(500).json({
        error: "AI 분석 결과를 읽지 못했습니다."
      });

    }


    const result = JSON.parse(outputText);

    return res.status(200).json(result);


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error.message ||
        "서버 처리 중 오류가 발생했습니다."
    });

  }

}
