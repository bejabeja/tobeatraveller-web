export const getImagesInfo = (city) => {
    const images = {
        "paris": {
            photoUrl: "https://images.pexels.com/photos/1446624/pexels-photo-1446624.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
            city: "Paris"
        },
        "tokyo": {
            photoUrl: "https://images.pexels.com/photos/2803229/pexels-photo-2803229.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
            city: "Tokyo"
        },
        "newYork": {
            photoUrl: "https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
            city: "New York"
        },
        "barcelona": {
            photoUrl: "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
            city: "Barcelona"
        }
    }

    return images[city];
}