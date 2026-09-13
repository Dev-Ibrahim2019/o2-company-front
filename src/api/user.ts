import api from "./axios";

export async function getUserName() {
  const response = await api.get("/user");
  return response.data.name ?? JSON.stringify(response.data);
}