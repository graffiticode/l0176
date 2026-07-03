// SPDX-License-Identifier: MIT
// Ported from L0158 packages/api/src/dataapi.js. Node >= 22 provides global
// fetch, so the node-fetch import is dropped.

export const buildDataApi = ({ baseUrl }: { baseUrl: string }) => async ({ route, request }: { route: string; request: any }) => {
  const endpoint = `${baseUrl}${route}`;
  const body = new URLSearchParams(request);
  const dataApiResp = await fetch(endpoint, {
    method: "POST",
    body,
  });
  const data: any = await dataApiResp.json();
  if (!dataApiResp.ok) {
    throw new Error(`Learnosity Data API error: ${dataApiResp.status} ${route} - ${JSON.stringify(data)}`);
  }
  if (data?.meta?.status === false) {
    throw new Error(`Learnosity Data API failed: ${route} - ${JSON.stringify(data.meta)}`);
  }
  return data;
};
