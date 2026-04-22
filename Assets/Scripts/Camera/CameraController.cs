using KillFrame.Core;
using UnityEngine;

namespace KillFrame.Camera
{
    /// <summary>
    /// First-person camera controller.
    /// Yaw is applied to the player body; pitch is applied to this Transform.
    /// Attach to the camera child of the player GameObject.
    /// </summary>
    public class CameraController : MonoBehaviour
    {
        [Header("Look Sensitivity")]
        [SerializeField] private float sensitivityX = 2f;
        [SerializeField] private float sensitivityY = 2f;

        [Header("Pitch Clamp")]
        [SerializeField] private float minPitch = -85f;
        [SerializeField] private float maxPitch = 85f;

        [Header("References")]
        [Tooltip("The player body that receives yaw rotation.")]
        [SerializeField] private Transform playerBody;

        private float _pitch;
        private bool _isAlive = true;

        private void Awake()
        {
            LockCursor(true);
        }

        private void OnEnable()
        {
            EventManager.Subscribe<PlayerDiedEvent>(OnPlayerDied);
        }

        private void OnDisable()
        {
            EventManager.Unsubscribe<PlayerDiedEvent>(OnPlayerDied);
        }

        private void Update()
        {
            if (!_isAlive) return;

            HandlePause();

            if (GameManager.Instance.IsPaused) return;

            ApplyMouseLook();
        }

        private void HandlePause()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
                LockCursor(!GameManager.Instance.IsPaused);
        }

        private void ApplyMouseLook()
        {
            float mouseX = Input.GetAxisRaw("Mouse X") * sensitivityX;
            float mouseY = Input.GetAxisRaw("Mouse Y") * sensitivityY;

            _pitch = Mathf.Clamp(_pitch - mouseY, minPitch, maxPitch);
            transform.localEulerAngles = new Vector3(_pitch, 0f, 0f);

            if (playerBody != null)
                playerBody.Rotate(Vector3.up * mouseX);
        }

        private static void LockCursor(bool locked)
        {
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }

        private void OnPlayerDied(PlayerDiedEvent _)
        {
            _isAlive = false;
            LockCursor(false);
        }
    }
}
