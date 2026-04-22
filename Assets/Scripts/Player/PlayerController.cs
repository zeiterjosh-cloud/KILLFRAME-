using KillFrame.Core;
using UnityEngine;

namespace KillFrame.Player
{
    /// <summary>
    /// First-person player movement: walk, sprint, jump, and gravity.
    /// Requires a CharacterController component on the same GameObject.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float walkSpeed = 6f;
        [SerializeField] private float sprintSpeed = 10f;
        [SerializeField] private float jumpForce = 5f;
        [SerializeField] private float gravity = -20f;

        [Header("Ground Check")]
        [SerializeField] private Transform groundCheck;
        [SerializeField] private float groundCheckRadius = 0.3f;
        [SerializeField] private LayerMask groundMask;

        private CharacterController _cc;
        private Vector3 _velocity;
        private bool _isGrounded;
        private bool _isAlive = true;

        private void Awake()
        {
            _cc = GetComponent<CharacterController>();
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
            if (!_isAlive || GameManager.Instance.IsPaused) return;

            HandleGroundCheck();
            HandleMovement();
            HandleJump();
            ApplyGravity();
        }

        private void HandleGroundCheck()
        {
            _isGrounded = Physics.CheckSphere(groundCheck.position, groundCheckRadius, groundMask);
            if (_isGrounded && _velocity.y < 0f)
                _velocity.y = -2f; // keep grounded
        }

        private void HandleMovement()
        {
            float h = Input.GetAxis("Horizontal");
            float v = Input.GetAxis("Vertical");
            bool isSprinting = Input.GetKey(KeyCode.LeftShift);

            float speed = isSprinting ? sprintSpeed : walkSpeed;
            Vector3 move = transform.right * h + transform.forward * v;
            _cc.Move(move * (speed * Time.deltaTime));
        }

        private void HandleJump()
        {
            if (Input.GetButtonDown("Jump") && _isGrounded)
                _velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);
        }

        private void ApplyGravity()
        {
            _velocity.y += gravity * Time.deltaTime;
            _cc.Move(_velocity * Time.deltaTime);
        }

        private void OnPlayerDied(PlayerDiedEvent _)
        {
            _isAlive = false;
        }

        private void OnDrawGizmosSelected()
        {
            if (groundCheck == null) return;
            Gizmos.color = Color.green;
            Gizmos.DrawWireSphere(groundCheck.position, groundCheckRadius);
        }
    }
}
