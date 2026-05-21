export class Place {
    constructor({ id, title, name, description, address, label, latitude, longitude, category, createdAt, updatedAt, orderIndex, dayNumber }) {
        this.id = id;
        this.title = title;
        this.name = name;
        this.description = description;
        this.address = address;
        this.label = label;
        this.latitude = latitude;
        this.longitude = longitude;
        this.category = category?.toLowerCase() || "other";
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.orderIndex = orderIndex;
        this.dayNumber = dayNumber ?? 1;
    }

    static fromDb(row, orderIndex, dayNumber) {
        return new Place({
            id: row.id,
            name: row.title,
            description: row.description,
            address: row.address,
            label: row.label,
            latitude: row.latitude,
            longitude: row.longitude,
            category: row.category,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            orderIndex,
            dayNumber: dayNumber ?? row.day_number ?? 1,
        });
    }

    toDTO() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            address: this.address,
            label: this.label,
            latitude: this.latitude,
            longitude: this.longitude,
            category: this.category,
            orderIndex: this.orderIndex,
            dayNumber: this.dayNumber,
        };
    }
}
