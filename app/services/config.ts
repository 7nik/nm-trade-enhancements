import { debug } from "../utils/utils";
import { getInitValue } from "./init";

export default await getInitValue("config");

debug("configs loaded");
