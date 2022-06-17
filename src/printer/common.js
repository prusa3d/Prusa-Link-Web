export const getPrinterLabel = (context) => {
    const parts = [];
    const location = context.version?.location
    const name = context.version?.name
    name && parts.push(name)
    location && parts.push(location)
    return parts.join(" - ")
}