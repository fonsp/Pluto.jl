/**
 * Scroll a cell into view with smooth animation
 * @param {string} cell_id - The ID of the cell element to scroll into view
 */
export const scroll_cell_into_view = (cell_id) => {
    const element = document.getElementById(cell_id)
    if (element) {
        element.scrollIntoView({
            block: "center",
            behavior: "smooth",
        })
    }
}