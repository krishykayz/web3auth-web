import { post } from "@toruslabs/http-helpers";
import JwtDecode from "jwt-decode";

import { ChainNamespaceType } from "../chain/IChainInterface";
import { authServer } from "../constants";
import log from "../loglevel";

export const checkIfTokenIsExpired = (token: string) => {
  const decoded = JwtDecode<{ exp: number }>(token);
  if (!decoded.exp) {
    return true;
  }
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    return true;
  }
  return false;
};

export const signChallenge = async (payload: Record<string, string | number>, chainNamespace: ChainNamespaceType): Promise<string> => {
  const t = chainNamespace === "solana" ? "sip99" : "eip191";
  const header = {
    t,
  };

  const network = chainNamespace === "solana" ? "solana" : "ethereum";
  const data = {
    payload,
    header,
    network,
  };
  const res = await post<{ success: boolean; challenge: string }>(`${authServer}/siww/get`, data);
  if (!res.success) {
    throw new Error("Failed to authenticate user, Please reach out to Web3Auth Support team");
  }

  return res.challenge;
};

export const verifySignedChallenge = async (
  chainNamespace: ChainNamespaceType,
  signedMessage: string,
  challenge: string,
  issuer: string,
  sessionTime: number
): Promise<string> => {
  const t = chainNamespace === "solana" ? "sip99" : "eip191";
  const sigData = {
    signature: {
      s: signedMessage,
      t,
    },
    message: challenge,
    issuer,
    audience: window.location.hostname,
    timeout: sessionTime,
  };

  const idTokenRes = await post<{ success: boolean; token: string; error?: string }>(`${authServer}/siww/verify`, sigData);
  if (!idTokenRes.success) {
    log.error("Failed to authenticate user, ,message verification failed", idTokenRes.error);
    throw new Error("Failed to authenticate user, ,message verification failed");
  }
  return idTokenRes.token;
};

export const getSavedToken = (userAddress: string, issuer: string) => {
  return localStorage.getItem(`${userAddress}_${issuer}`);
};

export const saveToken = (userAddress: string, issuer: string, token: string) => {
  return localStorage.setItem(`${userAddress}_${issuer}`, token);
};

export const clearToken = (userAddress: string, issuer: string) => {
  return localStorage.removeItem(`${userAddress}_${issuer}`);
};
