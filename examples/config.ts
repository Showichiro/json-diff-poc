import type { ComparisonConfig, ComparisonLogic } from "../main.ts";

const compareName: ComparisonLogic = (json1, json2) => {
  return json1.name === `${json2.firstName} ${json2.lastName}`;
};

const compareCity: ComparisonLogic = (json1, json2) => {
  return json1.address.city === json2.city;
};

export default {
  name: compareName,
  "address.city": compareCity,
} satisfies ComparisonConfig;
