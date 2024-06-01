import { defineBackend, secret } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { Stack } from "aws-cdk-lib/core";
import { GitHubProvider } from "./custom/GitHub/GitHubProvider";
import { TwitterProvider } from "./custom/Twitter/TwitterProvider";

const backend = defineBackend({
  auth,
  data,
});

// backend.auth.resources.userPool.addDomain("cognito-domain", {
//   cognitoDomain: {
//     domainPrefix: "test-nguyenvantinh06-domain-github",
//   },
// });

const existingStack = Stack.of(backend.auth.resources.userPool);

const { userPool, userPoolClient } = backend.auth.resources;

new GitHubProvider(existingStack, "GitHubProvider", {
  clientId: secret("GITHUB_CLIENT_ID"),
  clientSecret: secret("GITHUB_CLIENT_SECRET"),
  userPool,
  userPoolClient,
});

new TwitterProvider(existingStack, "TwitterProvider", {
  clientId: secret("TWITTER_CLIENT_ID"),
  clientSecret: secret("TWITTER_CLIENT_SECRET"),
  userPool,
  userPoolClient,
});
