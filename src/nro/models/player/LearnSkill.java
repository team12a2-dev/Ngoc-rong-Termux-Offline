package nro.models.player;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class LearnSkill {
    public long Time;
    public short ItemTemplateSkillId;
    public long Potential;
    public LearnSkill()
    {
        Time = -1;
        ItemTemplateSkillId = -1;
        Potential = 0;
    }
}
