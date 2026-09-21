import { BsBackpack4, BsThreeDots } from "react-icons/bs";
import { FaCity, FaFutbol, FaHiking, FaLandmark, FaMountain, FaSpa, FaUmbrellaBeach } from "react-icons/fa";
import { GiForestCamp, GiGreekTemple, GiIsland } from "react-icons/gi";
import { IoAirplaneOutline, IoBulbOutline, IoFlashOutline, IoHomeOutline, IoSnowSharp, IoTrainOutline } from "react-icons/io5";
import {
    MdOutlinePark
} from "react-icons/md";

import { FaBirthdayCake, FaCar, FaGlassCheers, FaUsers, FaWineBottle } from "react-icons/fa";
import { MdOutlineFastfood, MdOutlineSelfImprovement } from "react-icons/md";

export const categoryIcons = {
    //experience step types
    transport: IoTrainOutline,
    flight: IoAirplaneOutline,
    accommodation: IoHomeOutline,
    activity: IoFlashOutline,
    local_tip: IoBulbOutline,

    //placetypes
    nature: FaMountain,
    beach: FaUmbrellaBeach,
    city: FaCity,
    park: MdOutlinePark,
    monument: GiGreekTemple,
    camping: GiForestCamp,
    island: GiIsland,
    skiResort: IoSnowSharp,
    vineyard: FaWineBottle,
    sport: FaFutbol,
    other: BsThreeDots,

    //trip types
    adventure: FaHiking,
    relax: FaSpa,
    culture: FaLandmark,
    romantic: FaGlassCheers,
    roadtrip: FaCar,
    family: FaUsers,
    backpacking: BsBackpack4,
    wellness: MdOutlineSelfImprovement,
    gastronomic: MdOutlineFastfood,
    party: FaBirthdayCake,
    winterSports: IoSnowSharp
};

export const getCategoryIcon = (category) => categoryIcons[category];