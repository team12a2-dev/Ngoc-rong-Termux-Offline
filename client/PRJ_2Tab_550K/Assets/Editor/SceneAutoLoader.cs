#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

[InitializeOnLoad]
public static class SceneAutoLoader
{
    private const string MainScenePath = "Assets/Scenes/NROL.unity";

    static SceneAutoLoader()
    {
        EditorApplication.playModeStateChanged += OnPlayModeChanged;
    }

    private static void OnPlayModeChanged(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.ExitingEditMode)
        {
            var activeScene = EditorSceneManager.GetActiveScene();
            if (activeScene.path != MainScenePath)
            {
                if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                {
                    EditorSceneManager.OpenScene(MainScenePath);
                }
            }
        }
    }

    [MenuItem("Tools/Mở Scene Chính (NROL) %g")]
    public static void OpenMainScene()
    {
        if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
        {
            EditorSceneManager.OpenScene(MainScenePath);
            Debug.Log("<color=green>[SUCCESS]</color> Đã mở Scene chính: NROL.unity");
        }
    }
}
#endif
