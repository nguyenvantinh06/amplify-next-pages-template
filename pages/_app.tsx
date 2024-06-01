import "@/styles/app.css";
import type { AppProps } from "next/app";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

// Amplify.configure(outputs);

Amplify.configure(
  {
    ...outputs,
    Auth: {
      Cognito: {
        userPoolId: outputs.auth.user_pool_id,
        userPoolClientId: outputs.auth.user_pool_client_id,
        identityPoolId: outputs.auth.identity_pool_id,
        allowGuestAccess: true,
        passwordFormat: {
          // minLength:
          //   outputs.auth.aws_cognito_password_protection_settings
          //     .passwordPolicyMinLength,
          // below are all defaults, for the sake of the demo
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true,
          requireUppercase: true,
        },
        userAttributes: {
          email: {
            required: true,
          },
        },
        signUpVerificationMethod: "code",
        // loginWith: {
        //   oauth: {
        //     domain: "",
        //     // scopes: [
        //     //   "email",
        //     //   "profile",
        //     //   "openid",
        //     //   "aws.cognito.signin.user.admin",
        //     // ],
        //     redirectSignIn: ["http://localhost:3000"],
        //     redirectSignOut: ["http://localhost:3000"],
        //     responseType: "token",
        //   },
        // },
      },
    },
    API: {
      REST: {
        api: {
          endpoint: "",
        },
      },
    },
  },

  { ssr: true }
);

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
