const getCurrentDateTime = (): string => {
  return new Date(Date.now()).toLocaleString("ru", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
};

export default getCurrentDateTime;
