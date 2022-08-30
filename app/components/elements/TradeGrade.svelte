<!-- @component
    Renders a user trade grade icon
 -->
<script context="module" lang="ts">
    const GRADES = ['F', 'F+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    /**
     * Converts grade number to the grade name
     * @param grade - the grade number
     * @returns the grade name
     */
    export function getLetterGrade (grade: number) {
        return GRADES[grade];
    }
    /**
     * Converts grade number to the CSS class
     * @param grade - the grade number
     * @returns the CSS class
     */
    export function getLetterGradeClass (grade: number) {
        return GRADES[grade]
            .toLowerCase()
            .replace('-', '-minus')
            .replace('+', '-plus');
    }
    const EXTRA = "Not responding to trade offers brings down your Trader Grade, \
        while responding brings it up. You can also propose trades to help improve your grade.";
</script>
<script lang="ts">
    import type NM from "../../utils/NMTypes";
    
    import { error } from "../../utils/utils";
    
    export let user: NM.User;
    
    const grade = Math.floor(user.trader_score);
    if (grade < 0 || grade > 13) error("Bad grade", user.trader_score);
    const yourself = user.name === "You";
    const name = yourself ? "Your" : user.first_name+"'s";
    const tip = `${name} trader grade is: ${getLetterGrade(grade)}. ${yourself ? EXTRA : ""}`;
</script>

<svelte:options immutable/>

<span class="trader-grade tip {getLetterGradeClass(grade)}" title={tip}>
    {getLetterGrade(grade)}
</span> 
