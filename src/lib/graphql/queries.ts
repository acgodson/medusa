// First, let's define the query in a separate file
// /lib/graphql/queries.ts
import { gql } from 'graphql-request';

export const WORKFLOWS_QUERY = gql`
  {
    workflowCreateds(first: 5, orderBy: internal_id, orderDirection: desc) {
      internal_id
      creator
      ipnsId
    }
    deviceRegistereds(first: 5) {
      workflowId
      walletId
      userAddress
    }
  }
`;