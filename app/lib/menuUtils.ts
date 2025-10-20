import { Menu, Profile } from "./types";

export function buildColumns(
    menuObj: Menu,
    user: Profile | null,
) {
    const isLoggedIn = !!user;

    const filteredSubMenu = (menuObj.subMenu || []).filter((item) => {
        if (item.authRequired && !isLoggedIn) return false;
        if (
            item.roles && user?.global_role &&
            !item.roles.includes(user.global_role)
        ) {
            return false;
        }
        return true;
    });

    let columns: { heading: string; items: typeof filteredSubMenu }[] = [];
    if (menuObj.subMenuHeading?.length) {
        const numCols = menuObj.subMenuHeading.length;
        const itemsPerCol = Math.ceil(filteredSubMenu.length / numCols);
        columns = menuObj.subMenuHeading.map((heading, colIndex) => {
            const start = colIndex * itemsPerCol;
            const end = start + itemsPerCol;
            return {
                heading,
                items: filteredSubMenu.slice(start, end),
            };
        });
    } else {
        columns = [{ heading: "", items: filteredSubMenu }];
    }

    return columns;
}
