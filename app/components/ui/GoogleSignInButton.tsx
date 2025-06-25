"use client";

import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { loginWithGoogle } from "../../login/actions";

export default function GoogleSignInButton() {
  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);
  return (
    <>
      {domLoaded && (
        <>
          <div
            id="g_id_onload"
            data-client_id="678668846156-6hp9d0j0d3e04p22c0chvsid44ndlva7.apps.googleusercontent.com"
            data-context="signin"
            data-ux_mode="popup"
            data-callback="loginWithGoogle"
            data-nonce=""
            data-use_fedcm_for_prompt="true"
            data-use_fedcm_for_button="true"
            data-auto_prompt="false"
          ></div>

          <div
            className="g_id_signin"
            data-type="standard"
            data-shape="rectangular"
            data-theme="filled_blue"
            data-text="signin_with"
            data-size="medium"
            data-logo_alignment="left"
          ></div>
        </>
      )}
    </>
  );
}
