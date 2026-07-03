// SPDX-License-Identifier: MIT
// Ported from L0158 packages/api/src/author.js.
import { v4 as uuid } from "uuid";

export const buildInitAuthor = ({
  sdk,
  key,
  secret,
  domain,
}: any) => async ({ data, mode = "item_edit", widgetTypes, customWidgets }: any, { key: optKey, secret: optSecret }: any = {}) => {
  const user_id = uuid();
  const consumer = {
    consumer_key: optKey ?? key,
    domain,
    user_id,
  };

  const allowedWidgetTypes = widgetTypes || [
    "mcq",
    "shorttext",
    "longtext",
    "clozetext",
    "plaintext",
    "fillintheblanks",
    "association",
    "choicematrix",
    "classification",
    "clozeassociation",
    "clozedropdown",
    "clozeformula",
    "clozeinlinetext",
    "formula",
    "graphplotting",
    "highlighttext",
    "hotspot",
    "imageclozeassociation",
    "imageclozetext",
    "numberline",
    "orderlist",
    "sortlist",
    "tokenhighlight",
  ];

  const requestData: any = {
    mode,
    config: {
      dependencies: {
        questions_api: {
          init_options: {
            widgetTypes: allowedWidgetTypes,
          },
        },
      },
      widget_templates: {
        filter: widgetTypes ? {
          widgettype: widgetTypes,
        } : undefined,
        custom: customWidgets || [],
      },
      item_edit: {
        item: {
          reference: data?.reference,
          dynamic_content: true,
          shared_passage: true,
          features: true,
          tags: {
            show: true,
            edit: true,
          },
        },
        widget: {
          delete: true,
          edit: true,
        },
        widget_types: {
          show: true,
          enabled: allowedWidgetTypes,
        },
      },
      item_list: {
        filter: {
          restricted: {
            current_user: false,
          },
        },
        toolbar: {
          add: true,
          browse: true,
        },
      },
    },
    user: {
      id: user_id,
      firstname: "Author",
      lastname: "User",
    },
  };

  if (data) {
    Object.assign(requestData, data);
  }

  const signedRequest = sdk.init(
    "author",
    consumer,
    optSecret ?? secret,
    requestData,
  );
  return signedRequest;
};

export const buildCreateAuthor = ({
  sdk,
  key,
  secret,
  domain,
  dataApi,
}: any) => async ({
  mode = "item_edit",
  reference,
  id,
  config = {},
  organisation_id,
  user = {
    id: uuid(),
    firstname: "Author",
    lastname: "User",
  },
}: any) => {
  const itemRef = reference || `artcompiler-author-${id || uuid()}`;

  return {
    type: "author",
    data: {
      mode,
      reference: itemRef,
      config,
      organisation_id,
      user,
    },
  };
};
