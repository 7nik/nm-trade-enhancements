<script lang="ts">
    import type NM from "../../utils/NMTypes";

    export let sett: Pick<NM.Sett, "sett_assets"|"public_url"|"difficulty"> & Partial<Pick<NM.Sett,"links">>;
    export let size: keyof NM.Sett["sett_assets"] = "small";

    const src = sett.sett_assets[size].url;
</script>

<a target="_self" href={sett.links?.permalink ?? sett.public_url}>
    <span class="set {size}">
      <span class="pack">
        <span class="img">
            <img {src} alt="Series cover">
        </span>
        <span class="piece-info tip" title={sett.difficulty.name}>
          <span class="piece-name">
              <i class="i {sett.difficulty.class_name}"></i>
          </span>
        </span>
        </span>
    </span>
  </a>
