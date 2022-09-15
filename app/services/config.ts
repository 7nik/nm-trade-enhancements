import type Services from "../utils/NMServices";

import { debug } from "../utils/utils";
import { getInitValue } from "./init";

type Config = Services.ArtConfig 
    & Services.ArtConstants 
    & Services.ArtContentTypes;

export default await getInitValue<Config>("config");

debug("configs loaded");
