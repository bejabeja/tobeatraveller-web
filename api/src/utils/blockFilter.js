// SQL that keeps out whoever is blocked with the viewer, in either direction: what a
// blocked person wrote is not shown to who blocked them, and the other way round.
// `viewerParam` is the placeholder of the viewer's id ("$3"), `authorColumn` the column
// holding the id of who wrote what is being listed.
export const notBlockedWithViewer = (viewerParam, authorColumn) => `NOT EXISTS (
      SELECT 1 FROM user_blocks b
      WHERE (b.blocker_id = ${viewerParam} AND b.blocked_id = ${authorColumn})
         OR (b.blocker_id = ${authorColumn} AND b.blocked_id = ${viewerParam})
    )`;
