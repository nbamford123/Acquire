import { dispatchAppError, dispatchAuthError } from './EventBus.ts';
import type { GameAction } from '@acquire/engine/types';

const checkResult = async (res: Response) => {
  if (!res.ok) {
    if (res.status === 401) {
      dispatchAuthError();
    }
    let errorMessage = 'Unknown Error';
    try {
      const body = await res.json();
      errorMessage = body?.error || errorMessage;
    } catch {
      // ignore JSON parse errors
    }
    console.log('dispatching app error', errorMessage);
    dispatchAppError(errorMessage);
    return false;
  }
  return true;
};

export const getApi = async (path: string) => {
  const getResponse = await fetch(path);
  if (await checkResult(getResponse)) {
    return await getResponse.json();
  }
  return null;
};

export const postApi = async (path: string, body?: { action: GameAction }) => {
  const postResponse = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (await checkResult(postResponse)) {
    return await postResponse.json();
  }
  return null;
};

export const deleteApi = async (path: string) => {
  const deleteResponse = await fetch(path, {
    method: 'DELETE',
  });
  await checkResult(deleteResponse);
};
