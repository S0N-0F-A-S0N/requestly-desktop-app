import adblock from "../../../lib/adblock";

export const getLists = () => {
  return adblock.getLists();
};

export const enableList = (id: string, enabled: boolean) => {
  adblock.enableList(id, enabled);
};

export const updateList = async (id: string) => {
  await adblock.updateList(id);
};
