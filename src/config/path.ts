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
    path: "/inventory",
    getHref: () => "/inventory",
  },
  transactions: {
    root: {
      path: "/transactions",
      getHref: () => "/transactions",
    },
  },
  students: {
    add: {
      path: "/students/add",
      getHref: () => "/students/add",
    },
    uploads: {
      path: "/students/uploads",
      getHref: () => "/students/uploads",
    },
  },
  suppliers: {
    path: "/suppliers",
    getHref: () => "/suppliers",
  },
};
