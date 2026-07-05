"use client";

import { GraphQLClient } from "graphql-request";
import { env } from "@/lib/env";

const SUBGRAPH_URL =
  env.NEXT_PUBLIC_SUBGRAPH_URL ??
  "https://api.studio.thegraph.com/query/1745515/rangefrenzy/2";

export const subgraphClient = new GraphQLClient(SUBGRAPH_URL);
