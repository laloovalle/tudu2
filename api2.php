<?php
// ================================================================
// NEW api.php (Unificado + Seguro + Compatible + Modernizado)
// ================================================================

// ------------------------------
// CORS
// ------------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

// ------------------------------
// API KEY (igual que siempre)
// ------------------------------
$API_KEY_SECRET = "Laluscura2025_SecretKey_v1";

$headers = apache_request_headers();
$incoming_key = '';

// Soporte para múltiples formas de enviar KEY
if (isset($headers['Authorization'])) $incoming_key = $headers['Authorization'];
elseif (isset($_GET['key'])) $incoming_key = $_GET['key'];
elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) $incoming_key = $_SERVER['HTTP_AUTHORIZATION'];

if ($incoming_key !== $API_KEY_SECRET) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

// ------------------------------
// DB CONNECTION (segura)
// ------------------------------
try {
    require 'db.php'; // Aquí tenés tus credenciales reales
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$resource = $_GET['resource'] ?? 'tasks';

// Helper
function jsonInput() {
    return json_decode(file_get_contents("php://input"), true);
}

// =================================================================
// ROUTER GENERAL
// =================================================================

switch ($resource) {
    case 'tasks': handleTasks($pdo, $method); break;
    case 'users': handleUsers($pdo, $method); break;
    case 'companies': handleCompanies($pdo, $method); break;
    case 'projects': handleProjects($pdo, $method); break;
    case 'notes': handleNotes($pdo, $method); break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid resource']);
}


// =================================================================
// TASKS
// =================================================================
function handleTasks($pdo, $method) {

    if ($method === 'GET') {

        try {
            $sql = "
                SELECT 
                    t.*,
                    c.name AS company_name_resolved,
                    p.name AS project_name_resolved,
                    pt.title AS parent_title_resolved,
                    u.name AS owner_name_resolved,
                    tt.name AS task_type_name_resolved,
                    (SELECT GROUP_CONCAT(u2.name SEPARATOR '||') 
                        FROM task_collaborators tc 
                        JOIN users u2 ON tc.user_id = u2.id 
                        WHERE tc.task_id = t.id
                    ) AS collaborators_names,
                    (SELECT GROUP_CONCAT(tc.user_id SEPARATOR ',') 
                        FROM task_collaborators tc 
                        WHERE tc.task_id = t.id
                    ) AS collaborators_ids,
                    (SELECT COUNT(*) FROM task_notes n WHERE n.task_id = t.id) AS notes_count
                FROM tasks t
                LEFT JOIN companies c ON t.company_id = c.id
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN tasks pt ON t.parent_id = pt.id
                LEFT JOIN users u ON t.owner_id = u.id
                LEFT JOIN task_types tt ON t.task_type_id = tt.id
                ORDER BY t.created_at DESC
            ";

            $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $rows]);

        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }

    } elseif ($method === 'POST') {

        $data = jsonInput();
        $isUpdate = isset($data['id']) && $data['id'];
        $taskId = $isUpdate ? $data['id'] : null;

        // Normalizar valores
        $fields = [
            'title','description','priority','status','due_date','hours_estimated',
            'billing_status','company_id','owner_id','project_id','task_type_id',
            'order_index','parent_id','repository_url','work_url','created_by'
        ];
        foreach ($fields as $f) if (!isset($data[$f])) $data[$f] = null;

        $pdo->beginTransaction();

        try {

            if ($isUpdate) {

                $sql = "
                    UPDATE tasks SET
                        title=?, description=?, priority=?, status=?, due_date=?,
                        hours_estimated=?, billing_status=?, company_id=?, owner_id=?,
                        project_id=?, task_type_id=?, order_index=?, parent_id=?,
                        repository_url=?, work_url=?, updated_at=NOW()
                    WHERE id=?
                ";

                $pdo->prepare($sql)->execute([
                    $data['title'], $data['description'], $data['priority'], $data['status'], $data['due_date'],
                    $data['hours_estimated'], $data['billing_status'], $data['company_id'], $data['owner_id'],
                    $data['project_id'], $data['task_type_id'], $data['order_index'], $data['parent_id'],
                    $data['repository_url'], $data['work_url'],
                    $taskId
                ]);

            } else {

                $sql = "
                    INSERT INTO tasks (
                        title, description, priority, status, due_date,
                        hours_estimated, billing_status, company_id, owner_id,
                        project_id, task_type_id, order_index, parent_id,
                        repository_url, work_url, created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ";

                $pdo->prepare($sql)->execute([
                    $data['title'], $data['description'], $data['priority'], $data['status'], $data['due_date'],
                    $data['hours_estimated'], $data['billing_status'], $data['company_id'], $data['owner_id'],
                    $data['project_id'], $data['task_type_id'], $data['order_index'], $data['parent_id'],
                    $data['repository_url'], $data['work_url'], $data['created_by']
                ]);

                $taskId = $pdo->lastInsertId();
            }

            // Colaboradores
            $pdo->prepare("DELETE FROM task_collaborators WHERE task_id = ?")->execute([$taskId]);

            if (!empty($data['collaborators_ids']) && is_array($data['collaborators_ids'])) {
                $stmt = $pdo->prepare("INSERT INTO task_collaborators (task_id, user_id) VALUES (?, ?)");
                foreach ($data['collaborators_ids'] as $uid) {
                    if ($uid) $stmt->execute([$taskId, $uid]);
                }
            }

            $pdo->commit();
            echo json_encode(['status'=>'success','id'=>$taskId]);

        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
        }

    } elseif ($method === 'DELETE') {

        $id = $_GET['id'] ?? null;
        if (!$id) { echo json_encode(['status'=>'error','message'=>'Missing ID']); return; }

        try {
            // Eliminar notas, colaboradores, subtareas
            $pdo->prepare("DELETE FROM task_collaborators WHERE task_id=?")->execute([$id]);
            $pdo->prepare("DELETE FROM task_notes WHERE task_id=?")->execute([$id]);

            $pdo->prepare("DELETE FROM tasks WHERE id=?")->execute([$id]);

            echo json_encode(['status'=>'success']);
        } catch (Exception $e) {
            echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
        }
    }
}



// =================================================================
// USERS
// =================================================================
function handleUsers($pdo, $method) {

    if ($method === 'GET') {
        $sql = "SELECT u.*, c.name as company_name 
                FROM users u 
                LEFT JOIN companies c ON u.company_id = c.id
                ORDER BY u.name ASC";

        echo json_encode(['status'=>'success','data'=>$pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }

    if ($method === 'POST') {
        $d = jsonInput();

        $companyId = !empty($d['company_id']) ? $d['company_id'] : null;

        if (!empty($d['id'])) {
            $sql = "UPDATE users SET name=?, email=?, role=?, phone=?, avatar=?, company_id=?, daily_hours=?, job_title=? WHERE id=?";
            $pdo->prepare($sql)->execute([
                $d['name'], $d['email'], $d['role'], $d['phone'], $d['avatar'],
                $companyId, $d['daily_hours'], $d['job_title'], $d['id']
            ]);
            echo json_encode(['status'=>'success','id'=>$d['id']]);
        } else {
            $sql = "INSERT INTO users (name,email,role,phone,avatar,company_id,daily_hours,job_title)
                    VALUES (?,?,?,?,?,?,?,?)";
            $pdo->prepare($sql)->execute([
                $d['name'], $d['email'], $d['role'], $d['phone'], $d['avatar'],
                $companyId, $d['daily_hours'], $d['job_title']
            ]);
            echo json_encode(['status'=>'success','id'=>$pdo->lastInsertId()]);
        }
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'];
        try {
            $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
            echo json_encode(['status'=>'success']);
        } catch (Exception $e) {
            echo json_encode(['status'=>'error','message'=>'Cannot delete user']);
        }
    }
}



// =================================================================
// COMPANIES
// =================================================================
function handleCompanies($pdo, $method) {

    if ($method === 'GET') {
        echo json_encode(['status'=>'success','data'=>$pdo->query("SELECT * FROM companies ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }

    if ($method === 'POST') {
        $d = jsonInput();
        $active = $d['active'] ?? 1;

        if (!empty($d['id'])) {
            $sql = "
                UPDATE companies 
                SET name=?, notes=?, active=?, logo_url=?, drive_url=?, repository_url=?, work_url=? 
                WHERE id=?
            ";
            $pdo->prepare($sql)->execute([
                $d['name'], $d['notes'], $active, $d['logo_url'], $d['drive_url'],
                $d['repository_url'], $d['work_url'], $d['id']
            ]);
            echo json_encode(['status'=>'success','id'=>$d['id']]);
        } else {
            $sql = "
                INSERT INTO companies (name, notes, active, logo_url, drive_url, repository_url, work_url)
                VALUES (?,?,?,?,?,?,?)
            ";
            $pdo->prepare($sql)->execute([
                $d['name'], $d['notes'], $active, $d['logo_url'], $d['drive_url'],
                $d['repository_url'], $d['work_url']
            ]);
            echo json_encode(['status'=>'success','id'=>$pdo->lastInsertId()]);
        }
    }

    if ($method === 'DELETE') {
        try {
            $pdo->prepare("DELETE FROM companies WHERE id=?")->execute([$_GET['id']]);
            echo json_encode(['status'=>'success']);
        } catch (Exception $e) {
            echo json_encode(['status'=>'error','message'=>'Cannot delete company']);
        }
    }
}



// =================================================================
// PROJECTS
// =================================================================
function handleProjects($pdo, $method) {

    if ($method === 'GET') {
        $sql = "SELECT p.*, c.name as client_name_resolved 
                FROM projects p 
                LEFT JOIN companies c ON p.client_id = c.id
                ORDER BY p.name ASC";
        echo json_encode(['status'=>'success','data'=>$pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }

    if ($method === 'POST') {
        $d = jsonInput();
        $clientId = $d['client_id'] ?? null;

        if (!empty($d['id'])) {
            $sql = "
                UPDATE projects SET
                    name=?, description=?, client_id=?, status=?, start_date=?, end_date=?, 
                    repository_url=?, work_url=?
                WHERE id=?
            ";
            $pdo->prepare($sql)->execute([
                $d['name'], $d['description'], $clientId, $d['status'], 
                $d['start_date'], $d['end_date'], $d['repository_url'], $d['work_url'], 
                $d['id']
            ]);
            echo json_encode(['status'=>'success','id'=>$d['id']]);
        } else {
            $sql = "
                INSERT INTO projects (name, description, client_id, status, start_date, end_date, repository_url, work_url)
                VALUES (?,?,?,?,?,?,?,?)
            ";
            $pdo->prepare($sql)->execute([
                $d['name'], $d['description'], $clientId, $d['status'],
                $d['start_date'], $d['end_date'], $d['repository_url'], $d['work_url']
            ]);

            echo json_encode(['status'=>'success','id'=>$pdo->lastInsertId()]);
        }
    }

    if ($method === 'DELETE') {
        try {
            $pdo->prepare("DELETE FROM projects WHERE id=?")->execute([$_GET['id']]);
            echo json_encode(['status'=>'success']);
        } catch (Exception $e) {
            echo json_encode(['status'=>'error','message'=>'Cannot delete project']);
        }
    }
}



// =================================================================
// NOTES
// =================================================================
function handleNotes($pdo, $method) {

    if ($method === 'GET') {

        if (!isset($_GET['task_id'])) {
            echo json_encode(['status'=>'error','message'=>'Missing task_id']);
            return;
        }

        $sql = "
            SELECT n.*, u.name as user_name, u.avatar as user_avatar
            FROM task_notes n 
            LEFT JOIN users u ON n.user_id = u.id
            WHERE n.task_id = ?
            ORDER BY n.created_at DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$_GET['task_id']]);
        echo json_encode(['status'=>'success','data'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if ($method === 'POST') {

        $d = jsonInput();

        if (!empty($d['id'])) {
            $pdo->prepare("UPDATE task_notes SET content=? WHERE id=?")->execute([$d['content'], $d['id']]);
            echo json_encode(['status'=>'success']);
            return;
        }

        $sql = "INSERT INTO task_notes (task_id, user_id, content, is_read, created_at) VALUES (?, ?, ?, 0, NOW())";
        $pdo->prepare($sql)->execute([$d['task_id'], $d['user_id'], $d['content']]);
        echo json_encode(['status'=>'success', 'id'=>$pdo->lastInsertId()]);
    }

    if ($method === 'DELETE') {
        $pdo->prepare("DELETE FROM task_notes WHERE id=?")->execute([$_GET['id']]);
        echo json_encode(['status'=>'success']);
    }
}
?>
