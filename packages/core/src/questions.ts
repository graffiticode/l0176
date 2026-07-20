// SPDX-License-Identifier: MIT
// Ported from L0158 packages/api/src/questions.js.
import { v4 as uuid } from "uuid";

const replaceVariableRefs = (str: string) => {
  // Replace {{...}} with {{var:...}} for template variables,
  // but skip {{response}} which is a Learnosity cloze placeholder.
  return str.replace(/\{\{(?!response\}\})/g, "{{var:");
};

const isNonNullNonEmptyObject = (obj: any) => (
  typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).length > 0
);

const fixVariableRefs = (obj: any) => (
  Object.keys(obj).reduce((obj: any, key) => {
    const val = obj[key];
    if (typeof obj[key] === "string") {
      obj[key] = replaceVariableRefs(val);
    } else if (isNonNullNonEmptyObject(val)) {
      obj[key] = fixVariableRefs(val);
    }
    return obj;
  }, obj)
);

export const buildCreateQuestions = ({
  sdk,
  key,
  secret,
  domain,
  dataApi,
}: any) => async (data: any, { id, saveToItembank = false, key: optKey, secret: optSecret }: any = {}) => {
  const effKey = optKey ?? key;
  const effSecret = optSecret ?? secret;
  // Inherit a dynamic-data table from the first question whose data carries
  // one (typically an embedded L0166 custom question whose data includes
  // templateVariablesRecords). Items have one shared table in Learnosity's
  // model; first-wins matches the common single-widget-per-item case.
  let templateVariablesRecords;
  for (const q of data) {
    const records = q?.data?.templateVariablesRecords;
    if (Array.isArray(records) && records.length > 0) {
      templateVariablesRecords = records;
      break;
    }
  }
  const batchId = id || "0";
  const questions = data.map((question: any, index: number) => {
    const reference = `artcompiler-${question.type}-${batchId}-${index}`;
    const data = fixVariableRefs(question);
    return {
      type: question.type,
      reference,
      data,
    };
  });
  const questionRefs = questions.map((question: any) => question.reference);
  let itemBankResult;
  if (saveToItembank) {
    const questionsReq = sdk.init(
      "data",
      {
        consumer_key: effKey,
        domain,
      },
      effSecret,
      {
        questions,
      },
      "set",
    );
    await dataApi({
      route: "/itembank/questions",
      request: questionsReq,
    });
    // dataApi throws on non-2xx, so reaching here means the write succeeded.
    itemBankResult = {
      saved: true,
      references: questionRefs,
      savedAt: new Date().toISOString(),
    };
  }
  const questionsData: any = {
    "id": uuid(),
    "name": "Test",
    questions,
    session_id: uuid(),
  };
  if (itemBankResult) questionsData.itemBank = itemBankResult;
  return {
    type: "questions",
    data: questionsData,
    templateVariablesRecords,
    questionRefs,
  };
};

export const buildInitQuestions = ({
  sdk,
  key,
  secret,
  domain,
}: any) => async ({ data }: any, { key: optKey, secret: optSecret }: any = {}) => {
  // Construct a questions api request.
  const user_id = uuid();
  const consumer = {
    consumer_key: optKey ?? key,
    domain,
    user_id,
  };
  const signedRequest = sdk.init(
    "questions",
    consumer,
    optSecret ?? secret,
    data,
  );
  return signedRequest;
};
