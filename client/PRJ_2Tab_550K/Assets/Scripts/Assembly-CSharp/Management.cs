using UnityEngine.SceneManagement;

public class Management
{
    public static bool isLogo = true;

    // Local server endpoint: must match Config.properties server.port=14445.
    // 127.0.0.1 is correct when the client and Java server run on the same device.
    public static string IpServer = "NRO LOCAL:127.0.0.1:14445:0,0,0";

    public static string LinkWeb = "@godmobi";

    private static TabType[] tabTypes = new TabType[]
    {
        TabType.Tab1,
        TabType.Tab2
    };

    private static string[] SceneNames = new string[]
    {
         "NROL",
         "NROL1"
    };
    public static TabType tab;

    private static bool SceneLoad(string sceneName)
    {
        for (int i = 0; i < SceneManager.sceneCount; i++)
        {
            if (SceneManager.GetSceneAt(i).name == sceneName)
            {
                return true;
            }
        }
        return false;
    }

    public static void ChangeTab(int index)
    {
        tab = tabTypes[index];
        if (!SceneLoad(SceneNames[index]))
        {
            SceneManager.LoadScene(SceneNames[index], LoadSceneMode.Additive);
        }
    }
}

