// React Router matches `/secrets/` and `/secrets` alike, so a record must compare them alike too.
export const toRoutePath = (path: string): string => {
    let end = path.length;
    while (end > 1 && path[end - 1] === '/') end--;
    return path.slice(0, end);
};
