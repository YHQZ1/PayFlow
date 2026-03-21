import { v4 as uuidv4 } from "uuid";

const tenants = new Map();

export const createTenant = ({ name, email }) => {
  const id = uuidv4();
  const tenant = {
    id,
    name,
    email,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  tenants.set(id, tenant);
  return tenant;
};

export const getTenant = (id) => {
  return tenants.get(id) || null;
};
