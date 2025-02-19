import { gql } from "graphql-request";

export const WORKFLOWS_QUERY = gql`
  {
    workflowCreateds(first: 5, orderBy: internal_id, orderDirection: asc) {
      internal_id
      title
      owner
      schemaId
    }
    deviceRegistereds(first: 100) { 
      workflowId
      walletId
      deviceAddress
      registrar
    }
  }
`;
