import { useTranslation } from "react-i18next";
import Error from "./Error";

const NotFound = () => {
  const { t } = useTranslation();
  return <Error message={t("errors.pageNotFound")} />;
};

export default NotFound;
