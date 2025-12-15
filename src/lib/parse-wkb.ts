export function parsePostGISPoint(hex: string): { coordinates: [number, number] } | null {
    if (!hex || typeof hex !== 'string') return null;

    // Remove "0x" if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    // We expect Little Endian (01) Point (1) with SRID usually
    // Example: 0101000020E6100000...

    try {
        const hexToDouble = (hexStr: string) => {
            const buffer = new ArrayBuffer(8);
            const view = new DataView(buffer);
            for (let i = 0; i < 8; i++) {
                const byteVal = parseInt(hexStr.substr(i * 2, 2), 16);
                view.setUint8(i, byteVal);
            }
            // Assume Little Endian (PostGIS default on intel)
            return view.getFloat64(0, true);
        };

        let offset = 0;

        // 1 byte endian (2 chars)
        // 4 bytes type (8 chars)
        // 4 bytes SRID (8 chars) if type & 0x20000000

        // Fast path for standard PostGIS 4326 Point: 0101000020E6100000
        if (cleanHex.startsWith('0101000020E6100000')) {
            offset = 18;
        }
        // Fast path for Point without SRID: 0101000000
        else if (cleanHex.startsWith('0101000000')) {
            offset = 10;
        }
        else {
            // Fallback/Try our best: skip header (9 bytes)
            offset = 18;
        }

        const xHex = cleanHex.substr(offset, 16);
        const yHex = cleanHex.substr(offset + 16, 16);

        if (!xHex || !yHex || xHex.length !== 16 || yHex.length !== 16) return null;

        const lng = hexToDouble(xHex);
        const lat = hexToDouble(yHex);

        return { coordinates: [lng, lat] };
    } catch (e) {
        console.error('Error parsing WKB:', e);
        return null;
    }
}
