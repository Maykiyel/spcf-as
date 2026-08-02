export const routePaths = {
  auth: {
    login: {
      path: "/",
      getHref: () => "/",
    },
  },
  notFound: {
    path: "/not-found",
    getHref: () => "/not-found",
  },
  dashboard: {
    path: "/dashboard",
    getHref: () => "/dashboard",
  },
  inventory: {
    services: {
      path: "/inventory/services",
      getHref: () => "/inventory/services",
    },
    itemCodes: {
      path: "/inventory/item-codes",
      getHref: () => "/inventory/item-codes",
    },
  },
  transactions: {
    root: {
      path: "/transactions",
      getHref: () => "/transactions",
    },
  },
};
